<script>
    import { onMount } from 'svelte';
    import Playground from './lib/Playground.svelte';
    import { loadFromUrl } from './lib/loadFromUrl';

    let playground;
    let project = {
        files: [],
    };

    let settings = {
        autoClearOutput: false,
        splitterDirection: 'vertical',
        splitterSize: 75,
        sessions: {},
    };
    try {
        const savedSettings = localStorage.getItem('mznPlayground');
        if (savedSettings && savedSettings.length > 0) {
            settings = { ...settings, ...JSON.parse(savedSettings) };
        }
    } catch (e) {
        console.error(e);
    }
    const defaultModel = '% Use this editor as a MiniZinc scratch book\n';

    const alphabet =
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    function newSession() {
        const MAX_SESSIONS = 5;
        if (Object.keys(settings.sessions).length >= MAX_SESSIONS) {
            const sessions = Object.keys(settings.sessions).map((key) => ({
                key,
                value: settings.sessions[key],
            }));
            sessions.sort((a, b) => b.value.timestamp - a.value.timestamp);
            settings.sessions = sessions
                .slice(0, MAX_SESSIONS - 1)
                .reduce((acc, x) => ({ ...acc, [x.key]: x.value }), {});
        }
        const genId = () =>
            Array(6)
                .fill(0)
                .map(
                    () => alphabet[Math.floor(Math.random() * alphabet.length)],
                )
                .join('');
        let id = genId();
        while (id in settings.sessions) {
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

    async function hashChange() {
        if (sessionStorage.mznPlaygroundSession && playground.hasFiles()) {
            const project = playground.getProject();
            settings.sessions[sessionStorage.mznPlaygroundSession] = project;
        }

        if (window.location.hash.startsWith('#project=')) {
            try {
                const json = decodeURIComponent(
                    window.location.hash.substring(9),
                );
                project = migrateProject(JSON.parse(json));
                sessionStorage.mznPlaygroundSession = newSession();
                return;
            } catch (e) {
                console.error(e);
            }
        }

        if (window.location.hash.startsWith('#code=')) {
            try {
                const contents = decodeURIComponent(
                    window.location.hash.substring(6),
                );
                project = {
                    files: [
                        {
                            name: 'Playground.mzn',
                            contents,
                            anchor: contents.length,
                        },
                    ],
                };
                sessionStorage.mznPlaygroundSession = newSession();
                return;
            } catch (e) {
                console.error(e);
            }
        }

        if (window.location.hash.startsWith('#url=')) {
            try {
                const url = decodeURIComponent(
                    window.location.hash.substring(5),
                );
                project = await loadFromUrl(url);
                sessionStorage.mznPlaygroundSession = newSession();
                return;
            } catch (e) {
                console.error(e);
            }
        }

        if (sessionStorage.mznPlaygroundSession) {
            try {
                project = migrateProject(
                    settings.sessions[sessionStorage.mznPlaygroundSession],
                );
            } catch (e) {
                console.error(e);
            }
        } else {
            sessionStorage.mznPlaygroundSession = newSession();
        }

        if (project.files.length === 0) {
            project = {
                files: [
                    {
                        name: 'Playground.mzn',
                        contents: defaultModel,
                        anchor: defaultModel.length,
                    },
                ],
            };
        }
    }

    onMount(() => hashChange());

    function beforeUnload() {
        const project = playground.getProject();
        settings.sessions[sessionStorage.mznPlaygroundSession] = {
            ...project,
            timestamp: Date.now(),
        };
        localStorage.setItem('mznPlayground', JSON.stringify(settings));
    }
</script>

<svelte:window on:beforeunload={beforeUnload} on:hashchange={hashChange} />

<div class="playground-app">
    <Playground
        bind:this={playground}
        {project}
        bind:autoClearOutput={settings.autoClearOutput}
        bind:splitterDirection={settings.splitterDirection}
        bind:splitterSize={settings.splitterSize}
    />
</div>

<style>
    .playground-app {
        height: 100vh;
    }
</style>
