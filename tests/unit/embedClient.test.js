import { describe, expect, test, vi } from 'vitest';
import minizincPlayground from '../../src/embed.js';
import { createEmbedEnvelope } from '../../src/lib/embedProtocol.js';

function createHost() {
    const listeners = new Set();
    const frameWindow = { postMessage: vi.fn() };
    const hostWindow = {
        document: { baseURI: 'https://host.test/page.html' },
        addEventListener: (_type, listener) => listeners.add(listener),
        removeEventListener: (_type, listener) => listeners.delete(listener),
        setTimeout,
        clearTimeout,
        dispatch(data, source = frameWindow, origin = 'https://play.test') {
            for (const listener of listeners)
                listener({ data, source, origin });
        },
    };
    const iframe = {
        src: 'https://play.test/#embed={}',
        contentWindow: frameWindow,
    };
    return { hostWindow, frameWindow, iframe };
}

function ready(hostWindow) {
    hostWindow.dispatch(
        createEmbedEnvelope('ready', {
            minizincVersion: 'latest',
        }),
    );
}

function createEmbed(iframe, hostWindow) {
    const previousWindow = globalThis.window;
    globalThis.window = hostWindow;
    try {
        return minizincPlayground(iframe);
    } finally {
        globalThis.window = previousWindow;
    }
}

describe('embed client', () => {
    test('waits for ready, sends commands, and unwraps responses', async () => {
        const { hostWindow, frameWindow, iframe } = createHost();
        const embed = createEmbed(iframe, hostWindow);
        const project = { files: [] };
        const request = embed.loadProject(project);

        expect(frameWindow.postMessage).toHaveBeenCalledOnce();
        expect(frameWindow.postMessage.mock.calls[0][0]).toMatchObject({
            type: 'ready-request',
        });
        ready(hostWindow);
        await expect(embed.ready).resolves.toEqual({
            minizincVersion: 'latest',
        });

        const envelope = frameWindow.postMessage.mock.calls[1][0];
        expect(envelope).toMatchObject({
            type: 'load-project',
            payload: { project },
        });
        expect(frameWindow.postMessage.mock.calls[1][1]).toBe(
            'https://play.test',
        );

        hostWindow.dispatch(
            createEmbedEnvelope('response', { project }, envelope.requestId),
        );
        await expect(request).resolves.toEqual(project);
        embed.destroy();
    });

    test('recovers when initialised after the iframe announced ready', async () => {
        const { hostWindow, frameWindow, iframe } = createHost();
        hostWindow.dispatch(
            createEmbedEnvelope('ready', { minizincVersion: 'latest' }),
        );

        const embed = createEmbed(iframe, hostWindow);
        expect(frameWindow.postMessage).toHaveBeenCalledWith(
            createEmbedEnvelope('ready-request'),
            'https://play.test',
        );

        ready(hostWindow);
        await expect(embed.ready).resolves.toEqual({
            minizincVersion: 'latest',
        });
        embed.destroy();
    });

    test('maps commands and convenience callbacks', async () => {
        const { hostWindow, iframe } = createHost();
        const onOutput = vi.fn();
        const onProjectChanged = vi.fn();
        const embed = createEmbed(iframe, hostWindow);
        embed.on('minizinc', onOutput);
        embed.on('project-changed', onProjectChanged);
        ready(hostWindow);

        const changedProject = { files: [] };
        hostWindow.dispatch(
            createEmbedEnvelope('project-changed', {
                project: changedProject,
            }),
        );
        expect(onProjectChanged).toHaveBeenCalledWith(changedProject);

        hostWindow.dispatch(
            createEmbedEnvelope('minizinc', { message: 'hello' }),
        );
        expect(onOutput).toHaveBeenCalledWith({ message: 'hello' });

        const request = embed.getProject();
        const requestId =
            iframe.contentWindow.postMessage.mock.calls.at(-1)[0].requestId;
        hostWindow.dispatch(
            createEmbedEnvelope(
                'response',
                { project: { files: [] } },
                requestId,
            ),
        );
        await expect(request).resolves.toEqual({ files: [] });
        embed.destroy();
    });

    test('ignores messages from another source or origin', async () => {
        const { hostWindow, iframe } = createHost();
        const onProjectChanged = vi.fn();
        const embed = createEmbed(iframe, hostWindow);
        embed.on('project-changed', onProjectChanged);
        ready(hostWindow);
        hostWindow.dispatch(
            createEmbedEnvelope('project-changed', { project: { files: [] } }),
            {},
        );
        hostWindow.dispatch(
            createEmbedEnvelope('project-changed', { project: { files: [] } }),
            iframe.contentWindow,
            'https://evil.test',
        );
        expect(onProjectChanged).not.toHaveBeenCalled();
        embed.destroy();
    });

    test('rejects iframe errors and pending requests on destroy', async () => {
        const { hostWindow, iframe } = createHost();
        const embed = createEmbed(iframe, hostWindow);
        ready(hostWindow);
        const request = embed.run();
        const requestId =
            iframe.contentWindow.postMessage.mock.calls.at(-1)[0].requestId;
        hostWindow.dispatch(
            createEmbedEnvelope('error', { message: 'failed' }, requestId),
        );
        await expect(request).rejects.toThrow('failed');

        const pending = embed.stop();
        embed.destroy();
        await expect(pending).rejects.toThrow('destroyed');
        await expect(embed.run()).rejects.toThrow('destroyed');
    });

    test('keeps unanswered requests pending until destroy', async () => {
        const { hostWindow, iframe } = createHost();
        const embed = createEmbed(iframe, hostWindow);
        ready(hostWindow);
        const request = embed.compile();
        let settled = false;
        request.then(undefined, () => {
            settled = true;
        });
        await Promise.resolve();
        expect(settled).toBe(false);
        embed.destroy();
        await expect(request).rejects.toThrow('destroyed');
    });
});
