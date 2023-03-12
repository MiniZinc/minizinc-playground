<script>
    import { createEventDispatcher } from 'svelte';
    import Modal from './Modal.svelte';
    export let active = false;

    const dispatch = createEventDispatcher();
    let fileInput;
    let files;

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

<Modal {active} title="Create new file" on:cancel={() => dispatch('cancel')}>
    <aside class="menu">
        <p class="menu-label">Model</p>
        <ul class="menu-list">
            <li>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-missing-attribute -->
                <a on:click={() => dispatch('new', { type: '.mzn' })}
                    >Model file (.mzn)</a
                >
            </li>
            <li>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-missing-attribute -->
                <a on:click={() => dispatch('new', { type: '.mzc.mzn' })}
                    >Solution checker model (.mzc.mzn)</a
                >
            </li>
        </ul>
        <p class="menu-label">Data</p>
        <ul class="menu-list">
            <li>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-missing-attribute -->
                <a on:click={() => dispatch('new', { type: '.dzn' })}
                    >Data file (.dzn)</a
                >
            </li>
            <li>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-missing-attribute -->
                <a on:click={() => dispatch('new', { type: '.json' })}
                    >JSON data file (.json)</a
                >
            </li>
        </ul>
        <p class="menu-label">Import</p>
        <ul class="menu-list">
            <li>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-missing-attribute -->
                <a on:click={() => fileInput.click()}>Upload file(s)</a>
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
    accept=".mzn,.mzc,.dzn,.json"
/>
