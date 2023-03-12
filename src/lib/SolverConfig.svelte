<script>
    import { faXmark } from '@fortawesome/free-solid-svg-icons';
    import { createEventDispatcher } from 'svelte';
    import Fa from 'svelte-fa/src/fa.svelte';
    import { fly } from 'svelte/transition';

    const dispatch = createEventDispatcher();

    export let active;
    export let stdFlags = [];

    let enableTimeLimit = false;
    let timeLimit = 1;

    let allSolutions = false;

    let verboseCompilation = false;
    let verboseSolving = false;

    let compilerStatistics = false;
    let solvingStatistics = false;

    let outputTime = false;

    let freeSearch = false;

    $: validateTimeLimit(timeLimit);

    function validateTimeLimit(t) {
        const ms = t * 1000;
        if (ms !== Math.floor(ms)) {
            timeLimit = Math.floor(ms) / 1000;
        }
    }

    function hasStdFlag(stdFlags, f) {
        return stdFlags.indexOf(f) !== -1;
    }

    function reset() {
        enableTimeLimit = false;
        timeLimit = 1;

        allSolutions = false;

        verboseCompilation = false;
        verboseSolving = false;

        compilerStatistics = false;
        solvingStatistics = false;

        outputTime = false;

        freeSearch = false;
    }

    export function load(settings) {
        enableTimeLimit = settings.enableTimeLimit;
        timeLimit = settings.timeLimit;

        allSolutions = settings.allSolutions;

        verboseCompilation = settings.verboseCompilation;
        verboseSolving = settings.verboseSolving;

        compilerStatistics = settings.compilerStatistics;
        solvingStatistics = settings.solvingStatistics;

        outputTime = settings.outputTime;

        freeSearch = settings.freeSearch;
    }

    export function save() {
        return {
            enableTimeLimit,
            timeLimit,

            allSolutions,

            verboseCompilation,
            verboseSolving,

            compilerStatistics,
            solvingStatistics,

            outputTime,

            freeSearch,
        };
    }

    export function getSolvingConfiguration(solver) {
        const options = { solver };
        if (enableTimeLimit && timeLimit > 0) {
            options['time-limit'] = timeLimit * 1000;
        }
        if (allSolutions && hasStdFlag(stdFlags, '-a')) {
            options['all-satisfaction'] = true;
        }
        if (verboseCompilation) {
            options['verbose-compilation'] = true;
        }
        if (verboseSolving && hasStdFlag(stdFlags, '-v')) {
            options['verbose-solving'] = true;
        }
        if (compilerStatistics) {
            options['compiler-statistics'] = true;
        }
        if (solvingStatistics && hasStdFlag(stdFlags, '-s')) {
            options['solver-statistics'] = true;
        }
        if (outputTime) {
            options['output-time'] = true;
        }
        if (freeSearch && hasStdFlag(stdFlags, '-f')) {
            options['free-search'] = true;
        }
        return options;
    }

    export function getCompilationConfiguration(solver) {
        const options = { solver };
        if (verboseCompilation) {
            options['verbose-compilation'] = true;
        }
        if (compilerStatistics) {
            options['compiler-statistics'] = true;
        }
        return options;
    }
</script>

{#if active}
    <div transition:fly={{ x: 100, duration: 200 }} class="config-window">
        <button
            class="button is-white is-small exit-button"
            on:click={() => dispatch('close')}
        >
            <span class="icon"><Fa icon={faXmark} /></span>
        </button>

        <h5 class="title is-5">Solving options</h5>

        <div class="field is-grouped">
            <p class="control checkbox-control">
                <input
                    id="enable-timelimit"
                    type="checkbox"
                    bind:checked={enableTimeLimit}
                />
                <label for="enable-timelimit">Time limit (s)</label>
            </p>
            <p class="control is-expanded">
                <input
                    class="input is-fullwidth"
                    type="number"
                    step="1"
                    min={0}
                    disabled={!enableTimeLimit}
                    bind:value={timeLimit}
                />
            </p>
        </div>

        {#if hasStdFlag(stdFlags, '-a')}
            <div class="field">
                <p class="control checkbox-control">
                    <input
                        id="enable-all-solutions"
                        type="checkbox"
                        bind:checked={allSolutions}
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
                        bind:checked={freeSearch}
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
                    bind:checked={verboseCompilation}
                />
                <label for="enable-verbose-compile">Verbose compilation</label>
            </p>
        </div>

        {#if hasStdFlag(stdFlags, '-v')}
            <div class="field">
                <p class="control checkbox-control">
                    <input
                        id="enable-verbose-solve"
                        type="checkbox"
                        bind:checked={verboseSolving}
                    />
                    <label for="enable-verbose-solve">Verbose solving</label>
                </p>
            </div>
        {/if}

        <div class="field">
            <p class="control checkbox-control">
                <input
                    id="enable-compilation-satistics"
                    type="checkbox"
                    bind:checked={compilerStatistics}
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
                        bind:checked={solvingStatistics}
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
                    bind:checked={outputTime}
                />
                <label for="enable-timing-information">Timing information</label
                >
            </p>
        </div>

        <div class="field is-grouped bottom-buttons">
            <p class="control">
                <button
                    class="button is-primary"
                    on:click={() => dispatch('close')}
                >
                    Accept
                </button>
            </p>
            <p class="control">
                <button class="button is-danger" on:click={reset}
                    >Reset to defaults</button
                >
            </p>
        </div>
    </div>
{/if}

<style>
    .config-window {
        position: relative;
        padding: 1rem;
        flex: 0 0 30%;
        min-width: 300px;
        max-width: 450px;
        border-top: solid 1px hsl(0deg, 0%, 86%);
        border-left: solid 1px hsl(0deg, 0%, 86%);
    }
    .exit-button {
        position: absolute;
        top: 0;
        right: 0;
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
