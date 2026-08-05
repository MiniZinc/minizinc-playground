<script>
    import { run } from 'svelte/legacy';

    import { onMount } from 'svelte';
    import Playground from './lib/Playground.svelte';
    import RecentProjectsModal from './lib/RecentProjectsModal.svelte';
    import { loadFromUrl } from './lib/loadFromUrl';
    import Fa from 'svelte-fa';
    import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';
    import { settings } from './stores';

    let playground = $state();
    let project = $state({
        files: [],
    });
    let timestamp = null;
    let openRecent = $state(false);
    let solvers = $state([]);
    function getRecentProjects(solvers, $settings) {
        if (!playground || !$settings) {
            return [];
        }
        return Object.entries($settings.sessions)
            .map(([key, value]) => {
                const solver = solvers.find((s) => s.id === value.solverId);
                return {
                    key,
                    files: value.files,
                    timestamp: value.timestamp,
                    solver: solver ? solver.name : '<unknown solver>',
                };
            })
            .filter((p) => p.key !== sessionStorage.mznPlaygroundSession)
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    const defaultModel = '% Use this editor as a MiniZinc scratch book\n';

    const alphabet =
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    function newSession() {
        const genId = () =>
            Array(6)
                .fill(0)
                .map(
                    () => alphabet[Math.floor(Math.random() * alphabet.length)],
                )
                .join('');
        let id = genId();
        while (id in $settings.sessions) {
            id = genId();
        }
        return id;
    }

    function migrateProject(p) {
        if (!p.solverId) {
            // For backwards compatibility with initial version
            if (p.solver === 0) {
                p.solverId = 'org.minizinc.gecode_presolver';
            } else if (project.solver === 1) {
                p.solverId = 'org.minizinc.mip.coin-bc';
            }
        }
        return p;
    }

    let ignoreHashChange = false;
    async function hashChange() {
        const hash = window.location.hash;
        if (hash.length > 0) {
            ignoreHashChange = true;
            window.history.replaceState(
                undefined,
                undefined,
                window.location.pathname + window.location.search,
            );
            ignoreHashChange = false;
        }
        if (ignoreHashChange) {
            return;
        }

        if (hash.startsWith('#project=')) {
            try {
                const json = decodeURIComponent(hash.substring(9));
                openProject(newSession(), {
                    ...JSON.parse(json),
                    timestamp: Date.now(),
                });
                return;
            } catch (e) {
                console.error(e);
            }
        }

        if (hash.startsWith('#code=')) {
            try {
                const contents = decodeURIComponent(hash.substring(6));
                openProject(newSession(), {
                    files: [
                        {
                            name: 'Playground.mzn',
                            contents,
                            anchor: contents.length,
                        },
                    ],
                    timestamp: Date.now(),
                });
                return;
            } catch (e) {
                console.error(e);
            }
        }

        if (hash.startsWith('#url=')) {
            try {
                const url = decodeURIComponent(hash.substring(5));
                openProject(newSession(), await loadFromUrl(url));
                return;
            } catch (e) {
                console.error(e);
            }
        }

        if (
            sessionStorage.mznPlaygroundSession &&
            $settings.sessions[sessionStorage.mznPlaygroundSession]
        ) {
            openProject(
                sessionStorage.mznPlaygroundSession,
                $settings.sessions[sessionStorage.mznPlaygroundSession],
            );
            return;
        }

        if (project.files.length === 0) {
            openProject(newSession(), {
                files: [
                    {
                        name: 'Playground.mzn',
                        contents: defaultModel,
                        anchor: defaultModel.length,
                    },
                ],
                timestamp: Date.now(),
            });
        }
    }

    onMount(() => hashChange());

    function saveProject() {
        if (sessionStorage.mznPlaygroundSession && playground.hasFiles()) {
            try {
                const project = playground.getProject();

                if (
                    !(
                        sessionStorage.mznPlaygroundSession in
                        $settings.sessions
                    ) &&
                    playground.isDefaultSolver() &&
                    playground.isDefaultSolverConfig() &&
                    project.files.length === 1 &&
                    project.files[0].name === 'Playground.mzn' &&
                    project.files[0].contents === defaultModel
                ) {
                    // No need to save
                    return;
                }

                timestamp = Date.now();
                $settings.sessions[sessionStorage.mznPlaygroundSession] = {
                    ...project,
                    timestamp,
                };
            } catch (e) {
                console.error(e);
            }
        }
    }

    function openProject(key, proj) {
        saveProject();
        try {
            const toLoad = migrateProject(proj);
            sessionStorage.mznPlaygroundSession = key;
            project = toLoad;
            timestamp = proj.timestamp;
        } catch (e) {
            console.error(e);
        }
        openRecent = false;
        recentProjects = getRecentProjects(solvers, $settings);
    }

    function forkOnExternalChange($settings) {
        if (
            timestamp !== null &&
            sessionStorage.mznPlaygroundSession in $settings.sessions &&
            $settings.sessions[sessionStorage.mznPlaygroundSession].timestamp >
                timestamp
        ) {
            sessionStorage.mznPlaygroundSession = newSession();
            recentProjects = getRecentProjects(solvers, $settings);
        }
    }
    let recentProjects = $derived(getRecentProjects(solvers, $settings));
    run(() => {
        forkOnExternalChange($settings);
    });
</script>

<svelte:document
    onvisibilitychange={() => {
        if (document.hidden) {
            saveProject();
        }
    }}
/>
<svelte:window onbeforeunload={saveProject} onhashchange={hashChange} />

<div class="playground-app">
    <Playground
        bind:this={playground}
        {project}
        bind:autoClearOutput={$settings.autoClearOutput}
        bind:splitterDirection={$settings.splitterDirection}
        bind:splitterSize={$settings.splitterSize}
        on:solversChanged={(e) => (solvers = e.detail.solvers)}
    >
        {#snippet navbarBeforeShareButtons({ isMobile })}
            {#if isMobile}
                <!-- svelte-ignore a11y_invalid_attribute -->
                <a
                    class="navbar-item mobile-menu-item"
                    href="javascript:void(0);"
                    onclick={() => (openRecent = true)}
                >
                    <span class="icon">
                        <Fa icon={faClockRotateLeft} />
                    </span>
                    <span>Open recent project</span>
                </a>
            {:else}
                <div class="navbar-item">
                    <div class="field">
                        <div class="control">
                            <button
                                class="button"
                                title="Open recent project"
                                onclick={() => (openRecent = true)}
                            >
                                <span class="icon">
                                    <Fa icon={faClockRotateLeft} />
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            {/if}
        {/snippet}
        <RecentProjectsModal
            projects={recentProjects}
            active={openRecent}
            on:cancel={() => (openRecent = false)}
            on:accept={(e) =>
                openProject(
                    e.detail.project.key,
                    $settings.sessions[e.detail.project.key],
                )}
        />
    </Playground>
</div>

<style>
    .playground-app {
        height: 100vh;
    }
</style>
