<script>
    import { tick } from 'svelte';
    import Modal from './Modal.svelte';
    import { loadFromUrl } from './loadFromUrl';
    /**
     * @typedef {Object} Props
     * @property {boolean} [active]
     */

    /** @type {Props} */
    let { active = false, onactivate, oncancel, onopen, onnew } = $props();

    let fileInput = $state();
    let files = $state();
    let element = $state();
    let url = $state('');
    let importingFromUrl = $state(false);
    let error = $state(null);

    function reset(active) {
        importingFromUrl = false;
        url = '';
        error = null;
    }

    async function setFocus() {
        await tick();
        if (element) {
            element.focus();
        }
    }
    async function uploaded() {
        const promises = [];
        for (const file of files) {
            promises.push(
                new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        resolve({ name: file.name, contents: reader.result });
                    };
                    reader.onerror = (e) => reject(e);
                    reader.readAsText(file);
                }),
            );
        }
        const result = await Promise.all(promises);
        onopen?.({ files: result });
    }

    async function importFromUrl() {
        try {
            onopen?.(await loadFromUrl(url));
        } catch (e) {
            error = `Failed to import from URL: ${e.message || e}`;
            console.error(e);
        }
    }
    $effect(() => {
        reset(active);
    });
</script>

{#if importingFromUrl}
    <Modal
        {active}
        title="Import from URL"
        onactivate={setFocus}
        {oncancel}
        onsubmit={importFromUrl}
    >
        {#if error}
            <div class="error">
                {error}
            </div>
        {/if}
        <div class="field">
            <p class="control is-expanded">
                <input
                    bind:this={element}
                    class="input"
                    type="text"
                    pattern=".+\.(mzn|dzn|json|js|html|css|mzp|mzc)"
                    bind:value={url}
                    required
                />
            </p>
        </div>
        {#snippet footer()}
            <div>
                <button class="button is-primary">OK</button>
                <button
                    class="button"
                    type="button"
                    onclick={() => oncancel?.()}>Cancel</button
                >
            </div>
        {/snippet}
    </Modal>
{:else}
    <Modal {active} title="Create new file" onactivate={setFocus} {oncancel}>
        <aside class="menu">
            <p class="menu-label">Model</p>
            <ul class="menu-list">
                <li>
                    <button
                        type="button"
                        bind:this={element}
                        onclick={() => onnew?.({ type: '.mzn' })}
                    >
                        Model file (.mzn)
                    </button>
                </li>
                <li>
                    <button
                        type="button"
                        onclick={() => onnew?.({ type: '.mzc.mzn' })}
                    >
                        Solution checker model (.mzc.mzn)
                    </button>
                </li>
            </ul>
            <p class="menu-label">Data</p>
            <ul class="menu-list">
                <li>
                    <button
                        type="button"
                        onclick={() => onnew?.({ type: '.dzn' })}
                    >
                        Data file (.dzn)
                    </button>
                </li>
                <li>
                    <button
                        type="button"
                        onclick={() => onnew?.({ type: '.json' })}
                    >
                        JSON data file (.json)
                    </button>
                </li>
            </ul>
            <p class="menu-label">Visualisation</p>
            <ul class="menu-list">
                <li>
                    <button
                        type="button"
                        onclick={() => onnew?.({ type: '.html' })}
                    >
                        Custom visualisation (.html)
                    </button>
                </li>
            </ul>
            <p class="menu-label">Import</p>
            <ul class="menu-list">
                <li>
                    <button type="button" onclick={() => fileInput.click()}
                        >Upload file(s)</button
                    >
                </li>
                <li>
                    <button
                        type="button"
                        onclick={() => (importingFromUrl = true)}
                        >Import from URL</button
                    >
                </li>
            </ul>
        </aside>
    </Modal>
{/if}
<input
    class="is-hidden"
    type="file"
    bind:this={fileInput}
    bind:files
    onchange={uploaded}
    multiple
    accept=".mzn,.mzc,.dzn,.json,.html,.js,.css"
/>

<style>
    .is-hidden {
        display: none;
    }

    .error {
        padding: 0.5rem;
        border-radius: 0.5rem;
        background: rgb(255, 227, 227);
        color: rgb(175, 16, 16);
        margin-bottom: 1rem;
    }
</style>
