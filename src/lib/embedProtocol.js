const commandTypes = new Set([
    'load-project',
    'get-project',
    'run',
    'stop',
    'compile',
    'clear-output',
    'set-options',
]);

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseEmbedEnvelope(value) {
    if (!isObject(value)) return null;
    if (
        typeof value.type !== 'string' ||
        (value.requestId !== undefined &&
            (typeof value.requestId !== 'string' ||
                value.requestId.length === 0)) ||
        (value.payload !== undefined && !isObject(value.payload))
    )
        return null;
    return value;
}

export function createEmbedEnvelope(type, payload, requestId) {
    return {
        type,
        ...(requestId === undefined ? {} : { requestId }),
        ...(payload === undefined ? {} : { payload }),
    };
}

export function createEmbedProtocol({
    hostWindow,
    parentWindow = hostWindow.parent,
    operations,
    getReadyPayload = () => ({}),
    requestTimeout = 10000,
}) {
    let ready = false;
    let nextRequestId = 0;
    const pending = new Map();
    const send = (type, payload, requestId) =>
        parentWindow.postMessage(
            createEmbedEnvelope(type, payload, requestId),
            '*',
        );
    const rejectPending = (requestId, message) => {
        const request = pending.get(requestId);
        if (!request) return false;
        hostWindow.clearTimeout(request.timeout);
        pending.delete(requestId);
        request.reject(new Error(message));
        return true;
    };

    async function handleCommand({ type, payload = {}, requestId }) {
        if (!commandTypes.has(type)) {
            if (requestId)
                send(
                    'error',
                    { message: `Unknown command: ${type}` },
                    requestId,
                );
            return;
        }
        if (
            !isObject(payload) ||
            (type === 'load-project' && !isObject(payload.project))
        ) {
            if (requestId)
                send(
                    'error',
                    { message: `Invalid payload for ${type}` },
                    requestId,
                );
            return;
        }
        try {
            let result;
            if (type === 'load-project')
                result = await operations.loadProject(payload.project);
            else if (type === 'get-project')
                result = { project: operations.getProject() };
            else if (type === 'clear-output')
                result = await operations.clearOutput();
            else if (type === 'set-options')
                result = { options: await operations.setOptions(payload) };
            else result = await operations[type]();
            if (requestId) send('response', result ?? {}, requestId);
        } catch (error) {
            if (requestId) {
                send(
                    'error',
                    {
                        message:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    },
                    requestId,
                );
            }
        }
    }

    function onMessage(event) {
        if (event.source !== parentWindow) return;
        const message = parseEmbedEnvelope(event.data);
        if (!message) return;
        if (message.type === 'response' || message.type === 'error') {
            const request = pending.get(message.requestId);
            if (!request) return;
            hostWindow.clearTimeout(request.timeout);
            pending.delete(message.requestId);
            if (message.type === 'error')
                request.reject(
                    new Error(message.payload?.message || 'Host error'),
                );
            else request.resolve(message.payload);
            return;
        }
        if (ready) handleCommand(message);
    }

    return {
        start: () => hostWindow.addEventListener('message', onMessage),
        announceReady() {
            ready = true;
            send('ready', getReadyPayload());
        },
        notify(type, payload) {
            if (ready) send(type, payload);
        },
        request(type, payload = {}) {
            const requestId = `iframe-${++nextRequestId}`;
            return new Promise((resolve, reject) => {
                const timeout = hostWindow.setTimeout(
                    () =>
                        rejectPending(requestId, `Request timed out: ${type}`),
                    requestTimeout,
                );
                pending.set(requestId, { resolve, reject, timeout });
                send(type, payload, requestId);
            });
        },
        destroy() {
            hostWindow.removeEventListener('message', onMessage);
            for (const requestId of pending.keys())
                rejectPending(requestId, 'Embed protocol was destroyed');
            ready = false;
        },
    };
}
