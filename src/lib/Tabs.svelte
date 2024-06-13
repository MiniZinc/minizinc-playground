<script>
    import { createEventDispatcher } from 'svelte';
    import Tab from './Tab.svelte';
    import Fa from 'svelte-fa';
    import { faPlus, faFolderTree } from '@fortawesome/free-solid-svg-icons';
    import { flip } from 'svelte/animate';

    export let files = [];
    export let currentIndex = 0;
    export let readonly = false;

    const dispatch = createEventDispatcher();

    function onClick(index) {
        dispatch('selectTab', { index });
    }

    function onRename(event, index) {
        dispatch('rename', {
            index,
            ...event.detail,
        });
    }

    let dragIndex = null;
    function onDragStart(event, index) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.dropEffect = 'move';
        dragIndex = index;
    }
    function onDragOver(event) {
        if (dragIndex !== null) {
            event.preventDefault();
        }
    }
    function onDrop(event, index) {
        if (dragIndex === null) {
            return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (dragIndex !== index) {
            dispatch('reorder', { src: dragIndex, dest: index });
        }
        dragIndex = null;
    }

    function onClose(index) {
        dispatch('close', { index });
    }

    $: tabs = files
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
        .filter((f) => !f.hidden);
</script>

<div class="tabs is-boxed">
    <ul>
        {#each tabs as file (file.name)}
            <li
                animate:flip={{ duration: 200 }}
                class:is-active={currentIndex === file.index}
                draggable={true}
                on:dragstart={(e) => onDragStart(e, file.index)}
                on:dragover={onDragOver}
                on:drop={(e) => onDrop(e, file.index)}
            >
                <Tab
                    name={file.stem}
                    suffix={file.suffix}
                    active={currentIndex === file.index}
                    readonly={readonly || file.readonlyTab}
                    on:click={() => onClick(file.index)}
                    on:rename={(e) => onRename(e, file.index)}
                    on:close={(e) => onClose(file.index)}
                />
            </li>
        {/each}

        {#if !readonly}
            <li>
                <!-- svelte-ignore a11y-missing-attribute -->
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions-->
                <a title="Add new file" on:click={() => dispatch('newFile')}>
                    <span class="icon add-icon">
                        <Fa icon={faPlus} />
                    </span>
                </a>
            </li>
            <li class="right">
                <button
                    class="button is-small"
                    title="Manage files"
                    on:click={() => dispatch('manageFiles')}
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
