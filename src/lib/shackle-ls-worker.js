import initialise, { LanguageServer } from '@shackle-wasm';

let server;
const ready = (async () => {
    await initialise();
    server = new LanguageServer();
    postMessage({ type: 'ready' });
})().catch((error) => postMessage({ type: 'error', error: String(error) }));

self.onmessage = async ({ data }) => {
    await ready;
    if (!server) return;
    try {
        const output =
            data.type === 'remove'
                ? server.remove_project_file(data.name)
                : server.handle(JSON.parse(data.json));
        for (const message of output)
            postMessage({ type: 'lsp', json: JSON.stringify(message) });
    } catch (error) {
        postMessage({ type: 'error', error: String(error) });
    }
};
