<script>
    import { createEventDispatcher } from 'svelte';
    import Modal from './Modal.svelte';
    const dispatch = createEventDispatcher();

    export let modelFiles;
    export let active = false;
    let selectedModel = null;

    $: init(modelFiles);
    function init(modelFiles) {
        if (!selectedModel && modelFiles && modelFiles.length > 0) {
            selectedModel = modelFiles[0];
        }
    }

    function accept() {
        dispatch('accept', { modelFile: selectedModel });
    }
</script>

<Modal
    {active}
    title="Select model to run"
    on:cancel={() => dispatch('cancel')}
>
    <div class="select is-fullwidth">
        <select bind:value={selectedModel}>
            {#each modelFiles as modelFile}
                <option value={modelFile}>{modelFile}</option>
            {/each}
        </select>
    </div>
    <div slot="footer">
        <button class="button is-primary" on:click={accept}> OK </button>
        <button class="button" on:click={() => dispatch('cancel')}>
            Cancel
        </button>
    </div>
</Modal>
