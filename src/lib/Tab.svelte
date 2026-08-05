<script>
    import { run } from 'svelte/legacy';

    import { createEventDispatcher, tick } from 'svelte';
    import Fa from 'svelte-fa';
    import { faXmark } from '@fortawesome/free-solid-svg-icons';

    /**
     * @typedef {Object} Props
     * @property {boolean} [active]
     * @property {string} [name]
     * @property {string} [suffix]
     * @property {boolean} [readonly]
     */

    /** @type {Props} */
    let {
        active = false,
        name = 'Untitled',
        suffix = '.mzn',
        readonly = false,
    } = $props();

    const dispatch = createEventDispatcher();
    let isEditing = $state(false);
    let editInput = $state();
    let editValue = $state('');

    run(() => {
        if (/[\/\\\.]/.test(editValue)) {
            editValue = editValue.replaceAll(/[\/\\\.]/g, '');
        }
    });

    async function editName() {
        if (!active || readonly) {
            return;
        }
        isEditing = true;
        editValue = name;
        await tick();
        editInput.focus();
    }

    function editNameKeyUp(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            finishEditName();
        } else if (event.key === 'Escape') {
            isEditing = false;
        }
    }

    function finishEditName() {
        isEditing = false;
        if (editValue.length > 0) {
            dispatch('rename', { name: editValue, suffix });
        }
    }
</script>

<!-- svelte-ignore a11y_missing_attribute -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions-->
<a
    class="filename-link"
    class:active
    class:readonly
    onclick={() => {
        if (!isEditing) dispatch('click');
    }}
>
    {#if isEditing}
        <input
            size={editValue.length || name.length}
            bind:this={editInput}
            bind:value={editValue}
            onblur={finishEditName}
            onkeyup={editNameKeyUp}
            placeholder={name}
        />{suffix}
    {:else}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions-->
        <span class="filename" onclick={editName}>{name}{suffix}</span>
        {#if active && !readonly}
            <span class="close-tab" onclick={() => dispatch('close')}>
                <Fa icon={faXmark} />
            </span>
        {/if}
    {/if}
</a>

<style>
    .close-tab {
        padding-left: 0.5rem;
        cursor: pointer;
    }
    .active:not(.readonly) .filename {
        cursor: text;
    }

    .active.filename-link {
        cursor: default;
    }
</style>
