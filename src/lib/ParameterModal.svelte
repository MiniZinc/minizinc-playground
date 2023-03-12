<script>
    import { createEventDispatcher } from 'svelte';
    import Modal from './Modal.svelte';
    const dispatch = createEventDispatcher();

    export let active = false;
    export let parameters;
    export let dataFiles;
    export let selectedDataFiles = [];
    export let dataTab = true;

    let selectedFiles = [];
    let parameterValues = [];

    $: createSelectedFiles(selectedDataFiles);
    $: createParameterValues(parameters);
    $: hasDataFiles = dataFiles.length > 0;
    $: dataTabActive = hasDataFiles && dataTab;

    function createSelectedFiles(selectedDataFiles) {
        selectedFiles = [...selectedDataFiles];
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

<Modal {active} title="Model parameters" on:cancel={() => dispatch('cancel')}>
    {#if hasDataFiles}
        <div class="tabs">
            <ul>
                <li class:is-active={!dataTab}>
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-missing-attribute -->
                    <a on:click={() => (dataTab = false)}>Enter parameters</a>
                </li>
                <li class:is-active={dataTab}>
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-missing-attribute -->
                    <a on:click={() => (dataTab = true)}>Select data file</a>
                </li>
            </ul>
        </div>
    {/if}
    {#if dataTabActive}
        <div class="select is-fullwidth is-multiple">
            <select multiple size="8" bind:value={selectedFiles}>
                {#each dataFiles as dataFile}
                    <option value={dataFile}>{dataFile}</option>
                {/each}
            </select>
        </div>
    {:else}
        {#each parameterValues as param}
            <div class="param">
                <span>{param.name} = </span>
                <input class="input" bind:value={param.value} />
            </div>
        {/each}
    {/if}

    <div slot="footer">
        <button class="button is-primary" on:click={accept}> OK </button>
        <button class="button" on:click={() => dispatch('cancel')}>
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
