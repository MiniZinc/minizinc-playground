import { describe, expect, test, vi } from 'vitest';
import {
    createEmbedEnvelope,
    createEmbedProtocol,
    parseEmbedEnvelope,
} from '../../src/lib/embedProtocol.js';

function createWindow() {
    const listeners = new Set();
    return {
        addEventListener: (_type, listener) => listeners.add(listener),
        removeEventListener: (_type, listener) => listeners.delete(listener),
        dispatchMessage(data, source) {
            for (const listener of listeners)
                listener({ data, source, origin: 'https://host.test' });
        },
        setTimeout,
        clearTimeout,
    };
}

describe('embed protocol', () => {
    test('creates and parses envelopes', () => {
        const envelope = createEmbedEnvelope('get-project', {}, 'request-1');

        expect(parseEmbedEnvelope(envelope)).toEqual(envelope);
        expect(
            parseEmbedEnvelope({ ...envelope, payload: 'invalid' }),
        ).toBeNull();
    });

    test('discards commands before ready and rejects messages from another source', async () => {
        const hostWindow = createWindow();
        const parentWindow = { postMessage: vi.fn() };
        const operations = { getProject: vi.fn(() => ({ files: [] })) };
        const protocol = createEmbedProtocol({
            hostWindow,
            parentWindow,
            operations,
        });
        protocol.start();

        hostWindow.dispatchMessage(
            createEmbedEnvelope('get-project', {}, 'before'),
            parentWindow,
        );
        hostWindow.dispatchMessage(
            createEmbedEnvelope('get-project', {}, 'wrong'),
            {},
        );
        await Promise.resolve();
        expect(operations.getProject).not.toHaveBeenCalled();

        protocol.announceReady();
        hostWindow.dispatchMessage(
            createEmbedEnvelope('get-project', {}, 'after'),
            parentWindow,
        );
        await Promise.resolve();
        expect(operations.getProject).toHaveBeenCalledOnce();
        expect(parentWindow.postMessage).toHaveBeenLastCalledWith(
            createEmbedEnvelope(
                'response',
                { project: { files: [] } },
                'after',
            ),
            '*',
        );
    });

    test('correlates requests and cleans up unresolved requests on teardown', async () => {
        const hostWindow = createWindow();
        const parentWindow = { postMessage: vi.fn() };
        const protocol = createEmbedProtocol({
            hostWindow,
            parentWindow,
            operations: {},
        });
        protocol.start();
        const response = protocol.request('host-command');
        const request = parentWindow.postMessage.mock.calls[0][0];

        hostWindow.dispatchMessage(
            createEmbedEnvelope('response', { ok: true }, request.requestId),
            parentWindow,
        );
        await expect(response).resolves.toEqual({ ok: true });

        const pending = protocol.request('another-command');
        protocol.destroy();
        await expect(pending).rejects.toThrow('destroyed');
    });

    test('reports malformed and unknown commands safely', async () => {
        const hostWindow = createWindow();
        const parentWindow = { postMessage: vi.fn() };
        const protocol = createEmbedProtocol({
            hostWindow,
            parentWindow,
            operations: {},
        });
        protocol.start();
        protocol.announceReady();

        hostWindow.dispatchMessage({ type: 42 }, parentWindow);
        hostWindow.dispatchMessage(
            createEmbedEnvelope('unknown', {}, 'request-1'),
            parentWindow,
        );
        await Promise.resolve();
        expect(parentWindow.postMessage).toHaveBeenLastCalledWith(
            createEmbedEnvelope(
                'error',
                { message: 'Unknown command: unknown' },
                'request-1',
            ),
            '*',
        );
    });

    test('passes partial runtime options to the configured operation', async () => {
        const hostWindow = createWindow();
        const parentWindow = { postMessage: vi.fn() };
        const setOptions = vi.fn((options) => ({ ...options, theme: 'light' }));
        const protocol = createEmbedProtocol({
            hostWindow,
            parentWindow,
            operations: { setOptions },
        });
        protocol.start();
        protocol.announceReady();

        hostWindow.dispatchMessage(
            createEmbedEnvelope(
                'set-options',
                { splitterDirection: 'vertical' },
                'request-1',
            ),
            parentWindow,
        );
        await Promise.resolve();

        expect(setOptions).toHaveBeenCalledWith({
            splitterDirection: 'vertical',
        });
        expect(parentWindow.postMessage).toHaveBeenLastCalledWith(
            createEmbedEnvelope(
                'response',
                { options: { splitterDirection: 'vertical', theme: 'light' } },
                'request-1',
            ),
            '*',
        );
    });

    test('rejects invalid command payloads without calling operations', async () => {
        const hostWindow = createWindow();
        const parentWindow = { postMessage: vi.fn() };
        const operations = { loadProject: vi.fn() };
        const protocol = createEmbedProtocol({
            hostWindow,
            parentWindow,
            operations,
        });
        protocol.start();
        protocol.announceReady();

        hostWindow.dispatchMessage(
            createEmbedEnvelope('load-project', {}, 'request-1'),
            parentWindow,
        );
        await Promise.resolve();

        expect(operations.loadProject).not.toHaveBeenCalled();
        expect(parentWindow.postMessage).toHaveBeenLastCalledWith(
            createEmbedEnvelope(
                'error',
                { message: 'Invalid payload for load-project' },
                'request-1',
            ),
            '*',
        );
    });

    test('returns operation errors and times out unanswered requests', async () => {
        vi.useFakeTimers();
        try {
            const hostWindow = createWindow();
            const parentWindow = { postMessage: vi.fn() };
            const protocol = createEmbedProtocol({
                hostWindow,
                parentWindow,
                operations: {
                    clearOutput: vi.fn(() => {
                        throw new Error('cannot clear');
                    }),
                },
                requestTimeout: 10,
            });
            protocol.start();
            protocol.announceReady();

            hostWindow.dispatchMessage(
                createEmbedEnvelope('clear-output', {}, 'request-1'),
                parentWindow,
            );
            await Promise.resolve();
            expect(parentWindow.postMessage).toHaveBeenLastCalledWith(
                createEmbedEnvelope(
                    'error',
                    { message: 'cannot clear' },
                    'request-1',
                ),
                '*',
            );

            const pending = protocol.request('host-command');
            const assertion = expect(pending).rejects.toThrow(
                'Request timed out: host-command',
            );
            await vi.advanceTimersByTimeAsync(10);
            await assertion;
        } finally {
            vi.useRealTimers();
        }
    });
});
