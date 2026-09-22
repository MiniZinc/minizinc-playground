/**
 * Mockable boundary around wasm-pack's generated package. Vite resolves this
 * alias to the real ignored package only in a flagged build; ordinary builds
 * receive a local stub and carry no Shackle asset.
 */
import initialise, { transpile as wasmTranspile } from '@shackle-wasm';

let initialisation;

async function load() {
    if (!initialisation) {
        initialisation = Promise.resolve(initialise());
    }
    await initialisation;
}

/** @param {{ entry: string, files: Record<string, string>, target: 'minizinc' | 'microzinc' }} request */
export async function transpile(request) {
    await load();
    return wasmTranspile(request);
}
