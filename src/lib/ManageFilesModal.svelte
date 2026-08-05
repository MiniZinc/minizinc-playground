<script>
    import { createEventDispatcher } from 'svelte';
    import Modal from './Modal.svelte';
    import Fa from 'svelte-fa';
    import {
        faEye,
        faEyeSlash,
        faLock,
        faLockOpen,
        faTrash,
        faPlus,
    } from '@fortawesome/free-solid-svg-icons';

    /**
     * @typedef {Object} Props
     * @property {boolean} [active]
     * @property {any} [files]
     */

    /** @type {Props} */
    let { active = false, files = [] } = $props();

    const dispatch = createEventDispatcher();

    let indexed = $derived(files.map((file, index) => ({ file, index })));

    let models = $derived(
        indexed
            .filter(
                (f) =>
                    f.file.name.endsWith('.mzn') &&
                    !f.file.name.endsWith('.mzc.mzn'),
            )
            .sort((a, b) => a.file.name.localeCompare(b.file.name)),
    );

    let data = $derived(
        indexed
            .filter(
                (f) =>
                    f.file.name.endsWith('.dzn') ||
                    f.file.name.endsWith('.json'),
            )
            .sort((a, b) => a.file.name.localeCompare(b.file.name)),
    );

    let checkers = $derived(
        indexed
            .filter(
                (f) =>
                    f.file.name.endsWith('.mzc') ||
                    f.file.name.endsWith('.mzc.mzn'),
            )
            .sort((a, b) => a.file.name.localeCompare(b.file.name)),
    );

    let other = $derived(
        indexed
            .filter(
                (f) =>
                    !f.file.name.endsWith('.mzn') &&
                    !f.file.name.endsWith('.mzc') &&
                    !f.file.name.endsWith('.dzn') &&
                    !f.file.name.endsWith('.json'),
            )
            .sort((a, b) => a.file.name.localeCompare(b.file.name)),
    );

    let sections = $derived(
        [
            { label: 'Model files', files: models },
            { label: 'Data files', files: data },
            { label: 'Solution checkers', files: checkers },
            { label: 'Other files', files: other },
        ].filter((s) => s.files.length > 0),
    );

    function accept() {
        dispatch('close');
    }
</script>

<Modal {active} title="Manage files" on:submit={accept} on:cancel={accept}>
    {#each sections as section}
        <p>{section.label}</p>
        <table class="table is-fullwidth">
            <tbody>
                {#each section.files as { file, index }}
                    <tr>
                        <td>{file.name}</td>
                        <td>
                            <div class="tool-buttons">
                                <div class="field is-grouped">
                                    <p class="control">
                                        <button
                                            class="button is-small"
                                            title="Click to {file.hidden
                                                ? 'show'
                                                : 'hide'} this file"
                                            class:is-primary={!file.hidden}
                                            class:is-light={file.hidden}
                                            type="button"
                                            onclick={() =>
                                                dispatch('modifyFile', {
                                                    index,
                                                    options: {
                                                        hidden: !file.hidden,
                                                    },
                                                })}
                                        >
                                            <span class="icon">
                                                <Fa
                                                    icon={file.hidden
                                                        ? faEyeSlash
                                                        : faEye}
                                                />
                                            </span>
                                        </button>
                                    </p>
                                    <p class="control">
                                        {#if file.name.endsWith('.mzc')}
                                            <button
                                                class="button is-small is-light"
                                                title="Compiled checkers are read only"
                                                type="button"
                                                disabled
                                            >
                                                <span class="icon">
                                                    <Fa icon={faLock} />
                                                </span>
                                            </button>
                                        {:else}
                                            <button
                                                class="button is-small"
                                                title="Click to {file.readOnly
                                                    ? 'unlock'
                                                    : 'lock'} this file for editing"
                                                class:is-primary={!file.readOnly}
                                                class:is-light={file.readOnly}
                                                type="button"
                                                onclick={() =>
                                                    dispatch('modifyFile', {
                                                        index,
                                                        options: {
                                                            readOnly:
                                                                !file.readOnly,
                                                        },
                                                    })}
                                            >
                                                <span class="icon">
                                                    <Fa
                                                        icon={file.readOnly
                                                            ? faLock
                                                            : faLockOpen}
                                                    />
                                                </span>
                                            </button>
                                        {/if}
                                    </p>
                                    <p class="control">
                                        <button
                                            class="button is-small is-danger"
                                            title="Delete this file"
                                            type="button"
                                            onclick={() =>
                                                dispatch('delete', { index })}
                                        >
                                            <span class="icon">
                                                <Fa icon={faTrash} />
                                            </span>
                                        </button>
                                    </p>
                                </div>
                            </div>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/each}

    <div>
        <button
            class="button is-fullwidth"
            onclick={() => dispatch('newFile')}
            type="button"
        >
            <span class="icon">
                <Fa icon={faPlus} />
            </span>
            <span>Add new</span>
        </button>
    </div>

    {#snippet footer()}
        <div>
            <button class="button is-primary"> Accept </button>
        </div>
    {/snippet}
</Modal>

<style>
    .tool-buttons {
        display: flex;
        align-items: center;
        justify-content: flex-end;
    }
</style>
