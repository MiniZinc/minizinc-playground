<script>
    import Tab from './Tab.svelte';
    import Fa from 'svelte-fa';
    import { faPlus, faFolderTree } from '@fortawesome/free-solid-svg-icons';
    import { flip } from 'svelte/animate';

    /**
     * @typedef {Object} Props
     * @property {any[]} [files]
     * @property {number} [currentIndex]
     * @property {boolean} [readonly]
     * @property {(payload: { index: number }) => void} [onselectTab]
     * @property {(payload: { index: number, name: string, suffix: string }) => void} [onrename]
     * @property {(payload: { src: number, dest: number }) => void} [onreorder]
     * @property {(payload: { index: number }) => void} [onclose]
     * @property {() => void} [onnewFile]
     * @property {() => void} [onmanageFiles]
     */

    /** @type {Props} */
    let {
        files = [],
        currentIndex = 0,
        readonly = false,
        onselectTab,
        onrename,
        onreorder,
        onclose,
        onnewFile,
        onmanageFiles,
    } = $props();

    /** @param {number} index */
    function onClick(index) {
        onselectTab?.({ index });
    }

    /** @param {{ name: string, suffix: string }} payload @param {number} index */
    function renameTab(payload, index) {
        onrename?.({
            index,
            ...payload,
        });
    }

    let dragIndex = null;
    /** @param {DragEvent} event @param {number} index */
    function onDragStart(event, index) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.dropEffect = 'move';
        dragIndex = index;
    }
    /** @param {DragEvent} event */
    function onDragOver(event) {
        if (dragIndex !== null) {
            event.preventDefault();
        }
    }
    /** @param {DragEvent} event @param {number} index */
    function onDrop(event, index) {
        if (dragIndex === null) {
            return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (dragIndex !== index) {
            onreorder?.({ src: dragIndex, dest: index });
        }
        dragIndex = null;
    }

    /** @param {number} index */
    function onClose(index) {
        onclose?.({ index });
    }

    let tabs = $derived(
        files
            .map((f, index) => {
                const dot = f.name.endsWith('.mzc.mzn')
                    ? f.name.length - 8
                    : f.name.lastIndexOf('.');
                return {
                    ...f,
                    stem: f.name.substring(0, dot),
                    suffix: f.name.substring(dot),
                    index,
                };
            })
            .filter((f) => !f.hidden),
    );
</script>

<div class="tabs is-boxed">
    <ul>
        {#each tabs as file (file.name)}
            <li
                animate:flip={{ duration: 200 }}
                class:is-active={currentIndex === file.index}
                draggable={true}
                ondragstart={(e) => onDragStart(e, file.index)}
                ondragover={onDragOver}
                ondrop={(e) => onDrop(e, file.index)}
            >
                <Tab
                    name={file.stem}
                    suffix={file.suffix}
                    active={currentIndex === file.index}
                    readonly={readonly || file.readonlyTab}
                    onclick={() => onClick(file.index)}
                    onrename={(payload) => renameTab(payload, file.index)}
                    onclose={() => onClose(file.index)}
                />
            </li>
        {/each}

        {#if !readonly}
            <li>
                <!-- svelte-ignore a11y_missing_attribute -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions-->
                <a title="Add new file" onclick={() => onnewFile?.()}>
                    <span class="icon add-icon">
                        <Fa icon={faPlus} />
                    </span>
                </a>
            </li>
            <li class="right">
                <button
                    class="button is-small"
                    title="Manage files"
                    onclick={() => onmanageFiles?.()}
                >
                    <span class="icon">
                        <Fa icon={faFolderTree} />
                    </span>
                </button>
            </li>
        {/if}
    </ul>
</div>

<style>
    .tabs {
        margin-bottom: 0;
    }

    .add-icon {
        margin: 0 !important;
    }

    .right {
        flex: 1 1 auto;
        display: flex !important;
        justify-content: flex-end;
        padding-right: 0.5rem !important;
    }
</style>
