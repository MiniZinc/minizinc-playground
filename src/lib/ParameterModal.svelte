<script>
    import { createEventDispatcher, tick } from 'svelte';
    import Modal from './Modal.svelte';
    const dispatch = createEventDispatcher();

    export let active = false;
    export let parameters;
    export let dataFiles;

    let dataTab = true;
    let selectedFiles = [];
    let parameterValues = [];
    let focusInput;

    $: createParameterValues(parameters);
    $: hasDataFiles = dataFiles.length > 0;
    $: dataTabActive = hasDataFiles && dataTab;

    async function setFocus() {
        await tick();
        if (focusInput) {
            focusInput.focus();
        }
    }

    function createParameterValues(parameters) {
        parameterValues = Object.keys(parameters)
            .sort()
            .map((p) =>
                parameters[p] === undefined
                    ? { name: p, value: '' }
                    : { name: p, value: parameters[p] }
            );
    }

    function accept() {
        if (dataTabActive) {
            dispatch('accept', { dataFiles: selectedFiles });
        } else {
            dispatch('accept', {
                parameters: parameterValues.reduce(
                    (acc, param) => ({ ...acc, [param.name]: param.value }),
                    {}
                ),
            });
        }
    }
</script>

<Modal
    {active}
    title="Model parameters"
    on:activate={setFocus}
    on:submit={accept}
    on:cancel={() => dispatch('cancel')}
>
    {#if hasDataFiles}
        <div class="tabs">
            <ul>
                <li class:is-active={!dataTab}>
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-missing-attribute -->
                    <!-- svelte-ignore a11y-no-static-element-interactions-->
                    <a on:click={() => (dataTab = false)}>Enter parameters</a>
                </li>
                <li class:is-active={dataTab}>
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-missing-attribute -->
                    <!-- svelte-ignore a11y-no-static-element-interactions-->
                    <a on:click={() => (dataTab = true)}>Select data file</a>
                </li>
            </ul>
        </div>
    {/if}
    {#if dataTabActive}
        <div class="select is-fullwidth is-multiple">
            <select
                bind:this={focusInput}
                multiple
                size={Math.min(8, dataFiles.length)}
                bind:value={selectedFiles}
            >
                {#each dataFiles as dataFile}
                    <option value={dataFile}>{dataFile}</option>
                {/each}
            </select>
        </div>
    {:else}
        {#each parameterValues as param, i}
            <div class="param">
                <span>{param.name} = </span>
                {#if i === 0}
                    <input
                        class="input"
                        bind:this={focusInput}
                        bind:value={param.value}
                    />
                {:else}
                    <input class="input" bind:value={param.value} />
                {/if}
            </div>
        {/each}
    {/if}
    <div slot="footer">
        <button class="button is-primary">OK</button>
        <button
            type="button"
            class="button"
            on:click={() => dispatch('cancel')}
        >
            Cancel
        </button>
    </div>
</Modal>

<style>
    .param {
        display: flex;
        flex-direction: row;
        align-items: center;
    }
    .param input {
        flex: 1 1 auto;
        width: auto;
        margin-left: 1rem;
    }
</style>
