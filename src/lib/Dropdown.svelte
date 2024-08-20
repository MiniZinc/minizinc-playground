<script>
    import Fa from 'svelte-fa';
    import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    /**
     * @type {string | null}
     */
    export let title = null;
    export let items = [];
    /**
     * @type {any | null}
     */
    export let currentItem = null;

    export let active = false;
    export let disabled = false;

    let element;

    function selectItem(item) {
        dispatch('selectItem', { item });
        active = false;
    }

    function bodyClick(e) {
        if (element && !element.contains(e.target)) {
            active = false;
        }
    }
</script>

<svelte:body on:click={bodyClick} />

<div class="dropdown" class:is-active={active} bind:this={element} {title}>
    <div class="dropdown-trigger">
        <button class="button" on:click={() => (active = !active)} {disabled}>
            <span>
                {#if currentItem}
                    <slot name="selected" item={currentItem}>
                        {currentItem.label}
                    </slot>
                {/if}
            </span>
            <span class="icon is-small">
                <Fa icon={faAngleDown} />
            </span>
        </button>
    </div>
    <div class="dropdown-menu">
        <div class="dropdown-content">
            {#each items as item}
                <!-- svelte-ignore a11y-invalid-attribute -->
                <!-- svelte-ignore a11y-no-static-element-interactions-->
                <a
                    href="javascript:void(0);"
                    class="dropdown-item"
                    class:is-active={currentItem === item}
                    on:click={() => selectItem(item)}
                >
                    <slot name="item" {item}>{item.label}</slot>
                </a>
            {/each}
        </div>
    </div>
</div>
