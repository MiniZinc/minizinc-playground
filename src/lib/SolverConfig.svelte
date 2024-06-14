<script>
    import { faXmark } from '@fortawesome/free-solid-svg-icons';
    import { createEventDispatcher } from 'svelte';
    import Fa from 'svelte-fa';
    import { fly } from 'svelte/transition';

    const dispatch = createEventDispatcher();

    export let active;
    export let stdFlags = [];

    const defaultConfig = {
        enableTimeLimit: false,
        timeLimit: 1,
        allSolutions: false,
        verboseCompilation: false,
        verboseSolving: false,
        compilerStatistics: false,
        solvingStatistics: false,
        outputTime: false,
        freeSearch: false,
    };

    let config = {
        ...defaultConfig,
    };

    $: validateTimeLimit(config.timeLimit);

    function validateTimeLimit(t) {
        const ms = t * 1000;
        if (ms !== Math.floor(ms)) {
            config.timeLimit = Math.floor(ms) / 1000;
        }
    }

    function hasStdFlag(stdFlags, f) {
        return stdFlags.indexOf(f) !== -1;
    }

    export function isDefault() {
        for (const key in config) {
            if (defaultConfig[key] !== config[key]) {
                return false;
            }
        }
        return true;
    }

    export function reset() {
        config = { ...defaultConfig };
    }

    export function load(settings) {
        const cfg = { ...defaultConfig };
        for (const key in defaultConfig) {
            if (key in settings) {
                cfg[key] = settings[key];
            }
        }
        config = cfg;
    }

    export function save() {
        return { ...config };
    }

    export function getSolvingConfiguration(solver) {
        const options = { solver };
        if (config.enableTimeLimit && config.timeLimit > 0) {
            options['time-limit'] = config.timeLimit * 1000;
        }
        if (config.allSolutions && hasStdFlag(stdFlags, '-a')) {
            options['all-satisfaction'] = true;
        }
        if (config.verboseCompilation) {
            options['verbose-compilation'] = true;
        }
        if (config.verboseSolving && hasStdFlag(stdFlags, '-v')) {
            options['verbose-solving'] = true;
        }
        if (config.compilerStatistics) {
            options['compiler-statistics'] = true;
        }
        if (config.solvingStatistics && hasStdFlag(stdFlags, '-s')) {
            options['solver-statistics'] = true;
        }
        if (config.outputTime) {
            options['output-time'] = true;
        }
        if (config.freeSearch && hasStdFlag(stdFlags, '-f')) {
            options['free-search'] = true;
        }
        return options;
    }

    export function getCompilationConfiguration(solver) {
        const options = { solver };
        if (config.verboseCompilation) {
            options['verbose-compilation'] = true;
        }
        if (config.compilerStatistics) {
            options['compiler-statistics'] = true;
        }
        return options;
    }
</script>

{#if active}
    <div transition:fly={{ x: 100, duration: 200 }} class="config-window">
        <button
            class="button is-text is-small exit-button"
            on:click={() => dispatch('close')}
        >
            <span class="icon"><Fa icon={faXmark} /></span>
        </button>

        <form on:submit|preventDefault={() => dispatch('close')}>
            <h5 class="title is-5">Solving options</h5>
            <div class="field is-grouped">
                <p class="control checkbox-control">
                    <input
                        id="enable-timelimit"
                        type="checkbox"
                        bind:checked={config.enableTimeLimit}
                    />
                    <label for="enable-timelimit">Time limit (s)</label>
                </p>
                <p class="control is-expanded">
                    <input
                        class="input is-fullwidth"
                        type="number"
                        step="1"
                        min={0}
                        disabled={!config.enableTimeLimit}
                        bind:value={config.timeLimit}
                    />
                </p>
            </div>

            {#if hasStdFlag(stdFlags, '-a')}
                <div class="field">
                    <p class="control checkbox-control">
                        <input
                            id="enable-all-solutions"
                            type="checkbox"
                            bind:checked={config.allSolutions}
                        />
                        <label for="enable-all-solutions">
                            All solutions (for satisfication problems)
                        </label>
                    </p>
                </div>
            {/if}

            {#if hasStdFlag(stdFlags, '-f')}
                <div class="field">
                    <p class="control checkbox-control">
                        <input
                            id="enable-free-search"
                            type="checkbox"
                            bind:checked={config.freeSearch}
                        />
                        <label for="enable-free-search">Free search</label>
                    </p>
                </div>
            {/if}

            <h5 class="title is-5">Output options</h5>

            <div class="field">
                <p class="control checkbox-control">
                    <input
                        id="enable-verbose-compile"
                        type="checkbox"
                        bind:checked={config.verboseCompilation}
                    />
                    <label for="enable-verbose-compile"
                        >Verbose compilation</label
                    >
                </p>
            </div>

            {#if hasStdFlag(stdFlags, '-v')}
                <div class="field">
                    <p class="control checkbox-control">
                        <input
                            id="enable-verbose-solve"
                            type="checkbox"
                            bind:checked={config.verboseSolving}
                        />
                        <label for="enable-verbose-solve">Verbose solving</label
                        >
                    </p>
                </div>
            {/if}

            <div class="field">
                <p class="control checkbox-control">
                    <input
                        id="enable-compilation-satistics"
                        type="checkbox"
                        bind:checked={config.compilerStatistics}
                    />
                    <label for="enable-compilation-satistics"
                        >Compilation statistics</label
                    >
                </p>
            </div>

            {#if hasStdFlag(stdFlags, '-s')}
                <div class="field">
                    <p class="control checkbox-control">
                        <input
                            id="enable-solving-satistics"
                            type="checkbox"
                            bind:checked={config.solvingStatistics}
                        />
                        <label for="enable-solving-satistics"
                            >Solving statistics</label
                        >
                    </p>
                </div>
            {/if}

            <div class="field">
                <p class="control checkbox-control">
                    <input
                        id="enable-timing-information"
                        type="checkbox"
                        bind:checked={config.outputTime}
                    />
                    <label for="enable-timing-information"
                        >Timing information</label
                    >
                </p>
            </div>

            <div class="field is-grouped bottom-buttons">
                <p class="control">
                    <button class="button is-primary"> Accept </button>
                </p>
                <p class="control">
                    <button
                        type="button"
                        class="button is-danger"
                        on:click={reset}>Reset to defaults</button
                    >
                </p>
            </div>
        </form>
    </div>
{/if}

<style>
    .config-window {
        position: relative;
        padding: 1rem;
        flex: 0 0 30%;
        min-width: 300px;
        max-width: 450px;
        border-top: solid 1px var(--bulma-border);
        border-left: solid 1px var(--bulma-border);
    }
    .exit-button {
        position: absolute;
        top: 0;
        right: 0;
    }
    .title {
        margin-bottom: 1rem;
    }
    .checkbox-control {
        display: flex;
        align-items: center;
    }
    .checkbox-control > input[type='checkbox'] + label {
        margin-left: 0.5rem;
    }
    .bottom-buttons {
        margin-top: 2rem;
    }
</style>
