<script>
    import Fa from 'svelte-fa';
    import { faAngleDown } from '@fortawesome/free-solid-svg-icons';

    /**
     * @typedef {Object} Props
     * @property {string | null} [title]
     * @property {any[]} [items]
     * @property {any | null} [currentItem]
     * @property {boolean} [active]
     * @property {boolean} [disabled]
     * @property {import('svelte').Snippet<[{ item: any }]>} [selected]
     * @property {import('svelte').Snippet<[{ item: any }]>} [item]
     * @property {(payload: { item: any }) => void} [onselectItem]
     */
    /** @type {Props} */
    let {
        title = null,
        items = [],
        currentItem = null,
        active = $bindable(false),
        disabled = false,
        selected: selectedSnippet,
        item: itemSnippet,
        onselectItem,
    } = $props();

    let element = $state();

    /** @param {any} item */
    function selectItem(item) {
        onselectItem?.({ item });
        active = false;
    }

    /** @param {MouseEvent} e */
    function bodyClick(e) {
        if (element && !element.contains(e.target)) {
            active = false;
        }
    }
</script>

<svelte:body onclick={bodyClick} />

<div class="dropdown" class:is-active={active} bind:this={element} {title}>
    <div class="dropdown-trigger">
        <button class="button" onclick={() => (active = !active)} {disabled}>
            <span>
                {#if currentItem}
                    {@render selectedSnippet?.({ item: currentItem })}
                    {#if !selectedSnippet}
                        {currentItem.label}
                    {/if}
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
                <button
                    type="button"
                    class="dropdown-item"
                    class:is-active={currentItem === item}
                    onclick={() => selectItem(item)}
                >
                    {@render itemSnippet?.({ item })}
                    {#if !itemSnippet}{item.label}{/if}
                </button>
            {/each}
        </div>
    </div>
</div>
