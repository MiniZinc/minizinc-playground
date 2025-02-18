<script>
    import { createEventDispatcher } from 'svelte';

    export let msg;

    const dispatch = createEventDispatcher();

    function displayLocation(loc) {
        if (loc.firstLine == loc.lastLine) {
            if (loc.firstColumn == loc.lastColumn) {
                return `${loc.filename}:${loc.firstLine}.${loc.firstColumn}`;
            }
            return `${loc.filename}:${loc.firstLine}.${loc.firstColumn}-${loc.lastColumn}`;
        }
        return `${loc.filename}:${loc.firstLine}.${loc.firstColumn}-${loc.lastLine}.${loc.lastColumn}`;
    }
</script>

{#if msg.stack && msg.stack.length > 0}
    {#each msg.stack as entry, i}
        {#if i === 0 || entry.location.filename !== msg.stack[i - 1].location.filename || entry.location.firstLine !== msg.stack[i - 1].location.firstLine}
            <!-- svelte-ignore a11y-missing-attribute -->
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions-->
            <pre><a
                    class="mzn-link mzn-{msg.type}"
                    on:click={() =>
                        dispatch('goto', {
                            location: entry.location,
                        })}>{displayLocation(entry.location)}</a
                ></pre>
            <br />
        {/if}
        {#if entry.isCompIter}
            <pre>    with </pre>
        {:else}
            <pre>  in </pre>
        {/if}
        <pre>{entry.description}</pre>
        <br />
    {/each}
{:else if msg.location}
    <!-- svelte-ignore a11y-missing-attribute -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions-->
    <pre><a
            class="mzn-link mzn-{msg.type}"
            on:click={() =>
                dispatch('goto', {
                    location: msg.location,
                })}>{displayLocation(msg.location)}</a
        >:</pre>
    <br />
{/if}
{#if msg.includedFrom}
    {#each msg.includedFrom as include}
        <pre> (included from {include})</pre>
        <br />
    {/each}
{/if}
{#if msg.type === 'error'}
    <pre>MiniZinc:</pre>
{:else}
    <pre>Warning:</pre>
{/if}
{#if msg.what}
    <pre>{msg.what}: </pre>
{/if}
<pre>{msg.message}</pre>
{#if msg.cycle}
    {#each msg.cycle as it}
        <pre> {it}</pre>
        <br />
    {/each}
{/if}
<br />

<style>
    pre {
        padding: 0;
        background: none;
        display: inline;
        color: inherit;
        white-space: pre-wrap;
    }

    .mzn-error {
        color: var(--mzn-playground-red);
    }

    .mzn-warning {
        color: var(--mzn-playground-yellow);
    }

    .mzn-link {
        text-decoration: underline;
    }
</style>
