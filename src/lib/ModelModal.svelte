<script>
    import { run } from 'svelte/legacy';

    import { createEventDispatcher } from 'svelte';
    import Modal from './Modal.svelte';
    const dispatch = createEventDispatcher();

    /**
     * @typedef {Object} Props
     * @property {any} modelFiles
     * @property {boolean} [active]
     */

    /** @type {Props} */
    let { modelFiles, active = false } = $props();
    let selectedModel = $state(null);

    function init(modelFiles) {
        if (!selectedModel && modelFiles && modelFiles.length > 0) {
            selectedModel = modelFiles[0];
        }
    }

    function accept() {
        dispatch('accept', { modelFile: selectedModel });
    }
    run(() => {
        init(modelFiles);
    });
</script>

<Modal
    {active}
    title="Select model to run"
    on:submit={accept}
    on:cancel={() => dispatch('cancel')}
>
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
            <button
                type="button"
                class="button"
                onclick={() => dispatch('cancel')}
            >
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
