import {
    LSPClient,
    LSPPlugin,
    findReferencesKeymap,
    jumpToDefinitionKeymap,
    serverCompletion,
    serverDiagnostics,
    signatureHelp,
} from '@codemirror/lsp-client';
import { forEachDiagnostic } from '@codemirror/lint';
import { hoverTooltip } from '@codemirror/view';
import { keymap } from '@codemirror/view';

const workspace = 'file:///workspace/';

function diagnosticAt(state, pos) {
    let found = false;
    forEachDiagnostic(state, (_diagnostic, from, to) => {
        if (from <= pos && pos <= to) found = true;
    });
    return found;
}

function hoverContents(plugin, contents) {
    if (Array.isArray(contents))
        return contents.map((item) => hoverContents(plugin, item)).join('<br>');
    if (typeof contents === 'string')
        return plugin.docToHTML(contents, 'markdown');
    // LSP's legacy MarkedString form has `{ language, value }`, whereas
    // MarkupContent has `{ kind, value }`.
    if ('language' in contents)
        return plugin.docToHTML(contents.value, 'markdown');
    return plugin.docToHTML(contents);
}

const shackleHover = hoverTooltip(
    (view, pos) => {
        // CodeMirror lint owns the tooltip at an error/warning. Returning
        // nothing here prevents an empty LSP hover result from replacing it.
        if (diagnosticAt(view.state, pos)) return null;
        const plugin = LSPPlugin.get(view);
        if (!plugin || plugin.client.hasCapability('hoverProvider') === false)
            return null;
        plugin.client.sync();
        return plugin.client
            .request('textDocument/hover', {
                position: plugin.toPosition(pos),
                textDocument: { uri: plugin.uri },
            })
            .then((result) => {
                if (!result) return null;
                return {
                    pos: result.range
                        ? plugin.fromPosition(result.range.start)
                        : pos,
                    end: result.range
                        ? plugin.fromPosition(result.range.end)
                        : pos,
                    above: true,
                    create() {
                        const dom = document.createElement('div');
                        dom.className =
                            'cm-lsp-hover-tooltip cm-lsp-documentation';
                        dom.innerHTML = hoverContents(plugin, result.contents);
                        return { dom };
                    },
                };
            })
            .catch((error) => {
                console.error('[shackle-ls] hover request failed', error);
                return null;
            });
    },
    { hideOn: (transaction) => transaction.docChanged },
);

function formatPlaygroundDocument(view) {
    const plugin = LSPPlugin.get(view);
    if (
        !plugin ||
        plugin.client.hasCapability('documentFormattingProvider') === false
    )
        return false;
    plugin.client.sync();
    plugin.client
        .request('textDocument/formatting', {
            textDocument: { uri: plugin.uri },
            options: { tabSize: 2, insertSpaces: true },
        })
        .then((edits) => {
            // Shackle formats the complete document as one edit. Applying that
            // replacement directly avoids mapping an LSP range through workspace
            // changes made while the request was in flight.
            if (edits?.length !== 1 || edits[0].range.start.line !== 0) return;
            view.dispatch({
                changes: {
                    from: 0,
                    to: view.state.doc.length,
                    insert: edits[0].newText,
                },
                userEvent: 'format',
            });
        })
        .catch((error) =>
            plugin.reportError('Formatting request failed', error),
        );
    return true;
}

const playgroundFormatKeymap = [
    { key: 'Shift-Alt-f', run: formatPlaygroundDocument, preventDefault: true },
];

function renamePlaygroundSymbol(view) {
    const plugin = LSPPlugin.get(view);
    const word = view.state.wordAt(view.state.selection.main.head);
    if (
        !plugin ||
        !word ||
        plugin.client.hasCapability('renameProvider') === false
    )
        return false;
    const oldName = view.state.sliceDoc(word.from, word.to);
    const newName = window.prompt('New name', oldName);
    if (!newName || newName === oldName) return true;
    plugin.client.sync();
    plugin.client
        .request('textDocument/rename', {
            textDocument: { uri: plugin.uri },
            position: plugin.toPosition(word.from),
            newName,
        })
        .then((workspaceEdit) => {
            const documentEdit = workspaceEdit?.documentChanges?.find(
                (edit) => edit.textDocument?.uri === plugin.uri,
            );
            const edits =
                documentEdit?.edits || workspaceEdit?.changes?.[plugin.uri];
            if (!edits) return;
            const changes = edits
                .map((edit) => edit.textEdit || edit)
                .map((edit) => ({
                    from: plugin.fromPosition(edit.range.start),
                    to: plugin.fromPosition(edit.range.end),
                    insert: edit.newText,
                }))
                .sort((a, b) => b.from - a.from);
            view.dispatch({ changes, userEvent: 'rename' });
        })
        .catch((error) => plugin.reportError('Rename request failed', error));
    return true;
}

const playgroundRenameKeymap = [
    { key: 'F2', run: renamePlaygroundSymbol, preventDefault: true },
];

export function fileUri(name) {
    if (
        !name ||
        name.startsWith('/') ||
        name.split('/').some((p) => p === '..')
    ) {
        throw new Error(`invalid Playground project filename: ${name}`);
    }
    return new URL(name.split('/').map(encodeURIComponent).join('/'), workspace)
        .href;
}

class WorkerTransport {
    constructor(worker) {
        this.worker = worker;
        this.handlers = new Set();
        worker.addEventListener('message', ({ data }) => {
            if (data.type === 'lsp')
                this.handlers.forEach((handler) => handler(data.json));
            if (data.type === 'error')
                console.error('Shackle language server:', data.error);
        });
    }
    send(json) {
        this.worker.postMessage({ type: 'lsp', json });
    }
    subscribe(handler) {
        this.handlers.add(handler);
    }
    unsubscribe(handler) {
        this.handlers.delete(handler);
    }
}

function waitForWorker(worker) {
    return new Promise((resolve, reject) => {
        const onMessage = ({ data }) => {
            if (data.type === 'ready') finish(resolve);
            if (data.type === 'error')
                finish(
                    reject,
                    new Error(`Shackle Worker failed: ${data.error}`),
                );
        };
        const onError = (event) =>
            finish(reject, event.error || new Error(event.message));
        const timer = setTimeout(
            () => finish(reject, new Error('Shackle Worker startup timed out')),
            60_000,
        );
        function finish(callback, value) {
            clearTimeout(timer);
            worker.removeEventListener('message', onMessage);
            worker.removeEventListener('error', onError);
            callback(value);
        }
        worker.addEventListener('message', onMessage);
        worker.addEventListener('error', onError);
    });
}

/** Start the optional Worker and return an LSP client after initialize. */
export async function createShackleLanguageServer() {
    const worker = new Worker(
        new URL('./shackle-ls-worker.js', import.meta.url),
        { type: 'module' },
    );
    // Do not begin the LSP initialize request until WASM construction has
    // completed. Otherwise a slow cold load is indistinguishable from a
    // protocol timeout to @codemirror/lsp-client.
    await waitForWorker(worker);
    const transport = new WorkerTransport(worker);
    const client = new LSPClient({
        rootUri: workspace,
        // The first request is queued while the Worker fetches/compiles the
        // (deliberately self-contained) WASM package. The client default is 3 s,
        // which is too short even on an ordinary development server.
        timeout: 30_000,
        // The server otherwise may select UTF-8 when a client advertises it.
        extensions: [
            // Do not add the package's generic `hoverTooltips` here. It races the
            // diagnostic tooltip over malformed source and closes it when no symbol
            // hover result exists. Diagnostics, completion, and signatures remain
            // LSP-backed.
            serverDiagnostics(),
            serverCompletion(),
            signatureHelp(),
            shackleHover,
            keymap.of([
                ...playgroundFormatKeymap,
                ...playgroundRenameKeymap,
                ...jumpToDefinitionKeymap,
                ...findReferencesKeymap,
            ]),
            {
                clientCapabilities: {
                    general: { positionEncodings: ['utf-16'] },
                },
            },
        ],
    });
    try {
        client.connect(transport);
        await client.initializing;
        return {
            client,
            removeProjectFile(name) {
                worker.postMessage({ type: 'remove', name });
            },
            dispose() {
                worker.terminate();
            },
        };
    } catch (error) {
        worker.terminate();
        throw error;
    }
}
