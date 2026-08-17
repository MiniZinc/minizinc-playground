import { expect, test, vi } from 'vitest';
import {
    createEmbedEnvelope,
    createEmbedProtocol,
} from '../../src/lib/embedProtocol.js';
import { snapshotEmbedMessage } from '../../src/lib/embedMessage.svelte.js';

function createWindow() {
    const listeners = new Set();
    return {
        addEventListener: (_type, listener) => listeners.add(listener),
        removeEventListener: (_type, listener) => listeners.delete(listener),
        dispatchMessage(data, source) {
            for (const listener of listeners)
                listener({ data, source, origin: 'https://host.test' });
        },
    };
}

function createCloneCheckingParentWindow() {
    return {
        postMessage: vi.fn((message) => structuredClone(message)),
    };
}

class ReactiveSolverList {
    value = $state([
        {
            id: 'org.example.solver',
            metadata: { name: 'Example Solver', tags: ['cp', 'fast'] },
        },
    ]);
}

class ReactiveEnabledSolvers {
    value = $state(['org.example.solver']);
}

class ReactiveProject {
    value = $state({
        files: [
            {
                name: 'model.mzn',
                contents: 'solve satisfy;',
                readOnlyLines: [
                    [1, 1],
                    [3, 3],
                ],
            },
        ],
    });
}

class ReactiveMessage {
    value = $state({ payload: { values: ['before'] } });
}

function createProtocol(operations = {}) {
    const hostWindow = createWindow();
    const parentWindow = createCloneCheckingParentWindow();
    const protocol = createEmbedProtocol({
        hostWindow,
        parentWindow,
        operations,
    });
    protocol.start();
    protocol.announceReady();
    parentWindow.postMessage.mockClear();
    return { hostWindow, parentWindow, protocol };
}

test('snapshots embed messages before they are sent', () => {
    const message = new ReactiveMessage().value;

    const snapshot = snapshotEmbedMessage(message);
    message.payload.values[0] = 'after';

    expect(snapshot).toEqual({ payload: { values: ['before'] } });
    expect(() => structuredClone(snapshot)).not.toThrow();
});

test('sends cloneable solver notifications with reactive nested metadata', () => {
    const { parentWindow, protocol } = createProtocol();
    const solvers = new ReactiveSolverList().value;

    protocol.notify('solvers-changed', { solvers });

    expect(parentWindow.postMessage).toHaveBeenCalledWith(
        createEmbedEnvelope('solvers-changed', {
            solvers: [
                {
                    id: 'org.example.solver',
                    metadata: {
                        name: 'Example Solver',
                        tags: ['cp', 'fast'],
                    },
                },
            ],
        }),
        '*',
    );
});

test('sends cloneable set-options responses with reactive enabled solvers', async () => {
    const enabledSolvers = new ReactiveEnabledSolvers().value;
    const { hostWindow, parentWindow } = createProtocol({
        setOptions: () => ({ enabledSolvers }),
    });

    hostWindow.dispatchMessage(
        createEmbedEnvelope('set-options', {}, 'request-1'),
        parentWindow,
    );
    await Promise.resolve();

    expect(parentWindow.postMessage).toHaveBeenCalledWith(
        createEmbedEnvelope(
            'response',
            { options: { enabledSolvers: ['org.example.solver'] } },
            'request-1',
        ),
        '*',
    );
});

test('sends cloneable get-project responses with reactive read-only lines', async () => {
    const project = new ReactiveProject().value;
    const { hostWindow, parentWindow } = createProtocol({
        getProject: () => project,
    });

    hostWindow.dispatchMessage(
        createEmbedEnvelope('get-project', {}, 'request-1'),
        parentWindow,
    );
    await Promise.resolve();

    expect(parentWindow.postMessage).toHaveBeenCalledWith(
        createEmbedEnvelope(
            'response',
            {
                project: {
                    files: [
                        {
                            name: 'model.mzn',
                            contents: 'solve satisfy;',
                            readOnlyLines: [
                                [1, 1],
                                [3, 3],
                            ],
                        },
                    ],
                },
            },
            'request-1',
        ),
        '*',
    );
});

test('sends cloneable project-changed notifications with reactive read-only lines', () => {
    const { parentWindow, protocol } = createProtocol();
    const project = new ReactiveProject().value;

    protocol.notify('project-changed', { project });

    expect(parentWindow.postMessage).toHaveBeenCalledWith(
        createEmbedEnvelope('project-changed', {
            project: {
                files: [
                    {
                        name: 'model.mzn',
                        contents: 'solve satisfy;',
                        readOnlyLines: [
                            [1, 1],
                            [3, 3],
                        ],
                    },
                ],
            },
        }),
        '*',
    );
});
