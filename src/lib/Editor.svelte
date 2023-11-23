<script>
    import { EditorView } from '@codemirror/view';

    import { onMount, tick } from 'svelte';

    export let state;

    let div;
    let view;

    onMount(() => {
        view = new EditorView({
            parent: div,
        });
    });

    $: if (view && state && view.state !== state) {
        view.setState(state);
    }

    export function getView() {
        if (view) {
            return view;
        }
        return null;
    }

    export function getState() {
        if (view) {
            return view.state;
        }
        return null;
    }

    export async function setCursor(pos) {
        if (view) {
            await tick();
            view.dispatch({
                selection: { anchor: pos },
            });
        }
    }

    export function focus() {
        view.focus();
    }
</script>

<div class="mzn-editor" bind:this={div} />

<style>
    .mzn-editor {
        height: 100%;
        overflow: auto;
    }

    .mzn-editor :global(.cm-mzn-underline-error),
    .mzn-editor :global(.cm-mzn-underline-warning) {
        position: relative;
        display: inline-block;
    }

    .mzn-editor :global(.cm-mzn-underline-error),
    .mzn-editor :global(.cm-mzn-underline-error::before),
    .mzn-editor :global(.cm-mzn-underline-error::after) {
        border-color: var(--mzn-playground-red);
    }

    .mzn-editor :global(.cm-mzn-underline-warning),
    .mzn-editor :global(.cm-mzn-underline-warning::before),
    .mzn-editor :global(.cm-mzn-underline-warning::after) {
        border-color: var(--mzn-playground-yellow);
    }

    .mzn-editor :global(.cm-mzn-underline-error::before),
    .mzn-editor :global(.cm-mzn-underline-warning::before),
    .mzn-editor :global(.cm-mzn-underline-error::after),
    .mzn-editor :global(.cm-mzn-underline-warning::after) {
        content: '';
        border-bottom-width: 2px;
        border-bottom-style: dotted;
        position: absolute;
        display: block;
        pointer-events: none;
    }

    .mzn-editor :global(.cm-mzn-underline-error::before),
    .mzn-editor :global(.cm-mzn-underline-warning::before) {
        left: 2px;
        right: 0;
        bottom: 2px;
    }

    .mzn-editor :global(.cm-mzn-underline-error::after),
    .mzn-editor :global(.cm-mzn-underline-warning::after) {
        left: 0px;
        right: 2px;
        bottom: 0;
    }
</style>
