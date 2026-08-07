<script>
    import { tick } from 'svelte';
    import Modal from './Modal.svelte';

    /**
     * @typedef {Object} Props
     * @property {boolean} [active]
     * @property {Record<string, any>} parameters
     * @property {any[]} dataFiles
     * @property {() => void} [onactivate]
     * @property {(payload: { dataFiles?: any[], parameters?: object }) => void} [onaccept]
     * @property {() => void} [oncancel]
     */

    /** @type {Props} */
    let {
        active = false,
        parameters,
        dataFiles,
        onactivate,
        onaccept,
        oncancel,
    } = $props();

    let dataTab = $state(true);
    let selectedFiles = $state([]);
    let parameterValues = $state([]);
    let focusInput = $state();

    async function setFocus() {
        await tick();
        if (focusInput) {
            focusInput.focus();
        }
    }

    /** @param {Record<string, any>} parameters */
    function createParameterValues(parameters) {
        parameterValues = Object.keys(parameters)
            .sort()
            .map((p) =>
                parameters[p] === undefined
                    ? { name: p, value: '' }
                    : { name: p, value: parameters[p] },
            );
    }

    function accept() {
        if (dataTabActive) {
            onaccept?.({ dataFiles: selectedFiles });
        } else {
            onaccept?.({
                parameters: parameterValues.reduce(
                    (acc, param) => ({ ...acc, [param.name]: param.value }),
                    {},
                ),
            });
        }
    }
    $effect(() => {
        createParameterValues(parameters);
    });
    let hasDataFiles = $derived(dataFiles.length > 0);
    let dataTabActive = $derived(hasDataFiles && dataTab);
</script>

<Modal
    {active}
    title="Model parameters"
    onactivate={setFocus}
    onsubmit={accept}
    {oncancel}
>
    {#if hasDataFiles}
        <div class="tabs">
            <ul>
                <li class:is-active={!dataTab}>
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_missing_attribute -->
                    <!-- svelte-ignore a11y_no_static_element_interactions-->
                    <a onclick={() => (dataTab = false)}>Enter parameters</a>
                </li>
                <li class:is-active={dataTab}>
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_missing_attribute -->
                    <!-- svelte-ignore a11y_no_static_element_interactions-->
                    <a onclick={() => (dataTab = true)}>Select data file</a>
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
    {#snippet footer()}
        <div>
            <button class="button is-primary">OK</button>
            <button type="button" class="button" onclick={() => oncancel?.()}>
                Cancel
            </button>
        </div>
    {/snippet}
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
