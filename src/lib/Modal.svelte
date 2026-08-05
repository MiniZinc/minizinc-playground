<script>
    import { run, preventDefault } from 'svelte/legacy';

    import { createEventDispatcher, tick } from 'svelte';
    import { fade, fly } from 'svelte/transition';

    /**
     * @typedef {Object} Props
     * @property {any} title
     * @property {boolean} [active]
     * @property {import('svelte').Snippet} [children]
     * @property {import('svelte').Snippet} [footer]
     */

    /** @type {Props} */
    let { title, active = false, children, footer } = $props();
    const dispatch = createEventDispatcher();
    let form = $state();

    async function setFocus(active) {
        if (active) {
            await tick();
            if (form) {
                form.focus();
            }
            dispatch('activate');
        }
    }

    function cancel() {
        dispatch('cancel');
    }
    run(() => {
        setFocus(active);
    });
</script>

{#if active}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <form
        tabindex="0"
        bind:this={form}
        transition:fade={{ duration: 200 }}
        class="modal is-active"
        onsubmit={preventDefault(() => dispatch('submit'))}
    >
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions-->
        <div class="modal-background" onclick={cancel}></div>
        <div transition:fly={{ y: -200, duration: 200 }} class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">{title}</p>
                <button
                    type="button"
                    class="delete"
                    aria-label="close"
                    onclick={cancel}
                ></button>
            </header>
            <section class="modal-card-body">
                {@render children?.()}
            </section>
            <footer class="modal-card-foot">
                {#if footer}{@render footer()}{:else}
                    <button class="button" onclick={cancel}>Cancel</button>
                {/if}
            </footer>
        </div>
    </form>
{/if}
