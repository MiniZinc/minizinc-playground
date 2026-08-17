/**
 * Detach an iframe-to-host protocol message from Svelte reactive state before
 * it crosses the structured-clone boundary.
 *
 * @template T
 * @param {T} message
 * @returns {T}
 */
export function snapshotEmbedMessage(message) {
    const snapshot = $state.snapshot(message);

    // $state.snapshot warns when it cannot fully copy a value. Make that a
    // deterministic protocol-boundary failure while developing or testing.
    if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
        structuredClone(snapshot);
    }

    return snapshot;
}
