<script>
    import { EditorView } from '@codemirror/view';

    import { onMount, tick } from 'svelte';

    /**
     * @typedef {Object} Props
     * @property {import('@codemirror/state').EditorState} [state]
     * @property {(state: import('@codemirror/state').EditorState) => void} [onChange]
     */
    /** @type {Props} */
    let { state: editorState, onChange = () => {} } = $props();

    let div = $state();
    let view = $state();

    onMount(() => {
        view = new EditorView({
            parent: div,
            // The change hook has to live on the VIEW, not in the state's extensions.
            // `setState` replaces the whole state, configuration included, and the states
            // it is given are built in Playground.svelte without this listener — so an
            // `EditorView.updateListener` passed here would be discarded by the first
            // file switch or project load and never fire again.
            //
            // `setState` deliberately does not run through here: swapping files is not a
            // user edit, and Playground reports project loads by itself.
            dispatchTransactions: (transactions, editorView) => {
                editorView.update(transactions);
                if (transactions.some((tr) => tr.docChanged)) {
                    onChange(editorView.state);
                }
            },
        });
    });

    $effect(() => {
        if (view && editorState && view.state !== editorState) {
            view.setState(editorState);
        }
    });

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

    /** @param {import('@codemirror/state').EditorState} state */
    export function setState(state) {
        if (view && view.state !== state) {
            view.setState(state);
        }
    }

    /** @param {number} pos */
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

<div class="mzn-editor" bind:this={div}></div>

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
