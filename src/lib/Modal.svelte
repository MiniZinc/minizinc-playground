<script>
    import { createEventDispatcher } from 'svelte';
    import { fade, fly } from 'svelte/transition';

    export let title;
    export let active = false;
    const dispatch = createEventDispatcher();

    function cancel() {
        dispatch('cancel');
    }
</script>

{#if active}
    <div transition:fade={{ duration: 200 }} class="modal is-active">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="modal-background" on:click={cancel} />
        <div transition:fly={{ y: -200, duration: 200 }} class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">{title}</p>
                <button class="delete" aria-label="close" on:click={cancel} />
            </header>
            <section class="modal-card-body">
                <slot />
            </section>
            <footer class="modal-card-foot">
                <slot name="footer">
                    <button class="button" on:click={cancel}>Cancel</button>
                </slot>
            </footer>
        </div>
    </div>
{/if}
