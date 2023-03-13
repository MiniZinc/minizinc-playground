<script>
    import { onMount } from 'svelte';
    import Playground from './lib/Playground.svelte';

    let playground;
    let project = {
        files: [],
    };

    let settings = { autoClearOutput: false, sessions: {} };
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
    let currentSession;
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
                    () => alphabet[Math.floor(Math.random() * alphabet.length)]
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

    function hashChange() {
        if (currentSession && playground.hasFiles()) {
            const project = playground.getProject();
            settings.sessions[currentSession] = project;
        }

        if (window.location.hash.startsWith('#project=')) {
            try {
                const json = decodeURIComponent(
                    window.location.hash.substring(9)
                );
                project = migrateProject(JSON.parse(json));
                currentSession = newSession();
                window.location.hash = `#session=${currentSession}`;
                return;
            } catch (e) {
                console.error(e);
            }
        }

        if (!window.location.hash.startsWith('#session=')) {
            // Start new session
            window.history.replaceState(
                undefined,
                undefined,
                `#session=${newSession()}`
            );
            return;
        }

        const id = window.location.hash.substring(9);
        if (
            id !== currentSession &&
            settings.sessions &&
            settings.sessions[id]
        ) {
            try {
                project = migrateProject(settings.sessions[id]);
                currentSession = id;
            } catch (e) {
                console.error(e);
            }
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
        currentSession = id;
    }

    onMount(() => hashChange());

    function beforeUnload() {
        const project = playground.getProject();
        settings.sessions[currentSession] = {
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
    />
</div>

<style>
    .playground-app {
        height: 100vh;
    }
</style>
