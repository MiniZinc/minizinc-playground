/** Ordinary builds must not create a Worker or load the WASM package. */
export async function createShackleLanguageServer() {
    return null;
}
export function fileUri(name) {
    return `file:///workspace/${encodeURIComponent(name)}`;
}
