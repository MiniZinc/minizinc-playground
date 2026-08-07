<script>
    import Modal from './Modal.svelte';

    /**
     * @typedef {Object} Props
     * @property {any[]} modelFiles
     * @property {boolean} [active]
     * @property {(payload: { modelFile: any }) => void} [onaccept]
     * @property {() => void} [oncancel]
     */

    /** @type {Props} */
    let { modelFiles, active = false, onaccept, oncancel } = $props();
    let selectedModel = $state(null);

    /** @param {any[]} modelFiles */
    function init(modelFiles) {
        if (!selectedModel && modelFiles && modelFiles.length > 0) {
            selectedModel = modelFiles[0];
        }
    }

    function accept() {
        onaccept?.({ modelFile: selectedModel });
    }
    $effect(() => {
        init(modelFiles);
    });
</script>

<Modal {active} title="Select model to run" onsubmit={accept} {oncancel}>
    <div class="select is-fullwidth is-multiple">
        <select
            bind:value={selectedModel}
            size={Math.min(8, modelFiles.length)}
        >
            {#each modelFiles as modelFile}
                <option value={modelFile}>{modelFile}</option>
            {/each}
        </select>
    </div>
    {#snippet footer()}
        <div>
            <button class="button is-primary"> OK </button>
            <button type="button" class="button" onclick={() => oncancel?.()}>
                Cancel
            </button>
        </div>
    {/snippet}
</Modal>

<style>
    .select.is-multiple select {
        height: auto;
        padding: 0;
    }

    .select.is-multiple option {
        padding: 0.5em 1em;
    }
</style>
