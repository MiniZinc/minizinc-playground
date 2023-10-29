<script>
    import { createEventDispatcher, tick } from 'svelte';
    import Modal from './Modal.svelte';
    export let active = false;

    const dispatch = createEventDispatcher();
    let fileInput;
    let files;
    let element;

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
                })
            );
        }
        const result = await Promise.all(promises);
        dispatch('open', { files: result });
    }
</script>

<Modal
    {active}
    title="Create new file"
    on:activate={setFocus}
    on:cancel={() => dispatch('cancel')}
>
    <aside class="menu">
        <p class="menu-label">Model</p>
        <ul class="menu-list">
            <li>
                <button
                    type="button"
                    class="button is-text"
                    bind:this={element}
                    on:click={() => dispatch('new', { type: '.mzn' })}
                >
                    Model file (.mzn)
                </button>
            </li>
            <li>
                <button
                    type="button"
                    class="button is-text"
                    on:click={() => dispatch('new', { type: '.mzc.mzn' })}
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
                    class="button is-text"
                    on:click={() => dispatch('new', { type: '.dzn' })}
                >
                    Data file (.dzn)
                </button>
            </li>
            <li>
                <button
                    type="button"
                    class="button is-text"
                    on:click={() => dispatch('new', { type: '.json' })}
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
                    class="button is-text"
                    on:click={() => dispatch('new', { type: '.html' })}
                >
                    Custom visualisation (.html)
                </button>
            </li>
        </ul>
        <p class="menu-label">Import</p>
        <ul class="menu-list">
            <li>
                <button
                    type="button"
                    class="button is-text"
                    on:click={() => fileInput.click()}>Upload file(s)</button
                >
            </li>
        </ul>
    </aside>
</Modal>

<input
    class="is-hidden"
    type="file"
    bind:this={fileInput}
    bind:files
    on:change={uploaded}
    multiple
    accept=".mzn,.mzc,.dzn,.json,.html"
/>

<style>
    .is-hidden {
        display: none;
    }

    .menu-list .button {
        text-decoration: none;
        display: block;
        width: 100%;
        text-align: left;
    }
</style>
