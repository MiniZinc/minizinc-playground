import { createEmbedEnvelope, parseEmbedEnvelope } from './embedProtocol.js';

const REQUEST_TIMEOUT = 10000;

const commands = {
    loadProject: [
        'load-project',
        (payload) => ({ project: payload }),
        'project',
    ],
    getProject: ['get-project', undefined, 'project'],
    run: ['run'],
    stop: ['stop'],
    compile: ['compile'],
    clearOutput: ['clear-output'],
    setOptions: ['set-options', undefined, 'options'],
};

const supportedEvents = new Set([
    'ready',
    'project-changed',
    'solvers-changed',
    'run-started',
    'minizinc',
    'run-finished',
    'run-error',
]);

const eventPayloadKeys = {
    'project-changed': 'project',
    'solvers-changed': 'solvers',
};

function getOrigin(iframe, hostWindow) {
    const base = hostWindow.document?.baseURI || hostWindow.location?.href;
    if (!iframe.src || !base) {
        throw new TypeError('The iframe must have a usable src URL');
    }
    return new URL(iframe.src, base).origin;
}

function createError(message) {
    return message instanceof Error ? message : new Error(String(message));
}

export default function minizincPlayground(iframe) {
    if (!iframe || !iframe.contentWindow) {
        throw new TypeError('Expected an iframe with a contentWindow');
    }

    const hostWindow = window;
    const targetOrigin = getOrigin(iframe, hostWindow);
    const frameWindow = iframe.contentWindow;
    const listeners = new Map();
    const pending = new Map();
    const queued = [];
    let nextRequestId = 0;
    let ready = false;
    let destroyed = false;
    let readyInfo;
    let resolveReady;
    let rejectReady;
    const readyPromise = new Promise((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
    });
    const readyTimeout = hostWindow.setTimeout(() => {
        if (!ready) rejectReady(new Error('Playground ready timed out'));
    }, REQUEST_TIMEOUT);

    function send(type, payload, requestId) {
        frameWindow.postMessage(
            createEmbedEnvelope(type, payload, requestId),
            targetOrigin,
        );
    }

    function notifyListeners(type, payload) {
        const callbacks = listeners.get(type);
        if (!callbacks) return;
        for (const callback of [...callbacks]) {
            try {
                callback(payload);
            } catch (error) {
                hostWindow.setTimeout(() => {
                    throw error;
                }, 0);
            }
        }
    }

    function rejectEntry(entry, error) {
        hostWindow.clearTimeout(entry.timeout);
        pending.delete(entry.requestId);
        const index = queued.indexOf(entry);
        if (index !== -1) queued.splice(index, 1);
        entry.reject(createError(error));
    }

    function sendEntry(entry) {
        if (destroyed) {
            rejectEntry(entry, 'Playground embed was destroyed');
            return;
        }
        pending.set(entry.requestId, entry);
        send(entry.type, entry.payload, entry.requestId);
    }

    function flushQueue() {
        while (queued.length > 0) sendEntry(queued.shift());
    }

    function onMessage(event) {
        if (event.source !== frameWindow || event.origin !== targetOrigin)
            return;
        const message = parseEmbedEnvelope(event.data);
        if (!message) return;

        if (message.type === 'ready') {
            if (ready) return;
            ready = true;
            readyInfo = message.payload || {};
            hostWindow.clearTimeout(readyTimeout);
            resolveReady(readyInfo);
            notifyListeners('ready', readyInfo);
            flushQueue();
            return;
        }

        if (message.type === 'response' || message.type === 'error') {
            const entry = pending.get(message.requestId);
            if (!entry) return;
            hostWindow.clearTimeout(entry.timeout);
            pending.delete(message.requestId);
            if (message.type === 'error')
                entry.reject(
                    new Error(message.payload?.message || 'Host error'),
                );
            else
                entry.resolve(
                    entry.resultKey
                        ? message.payload?.[entry.resultKey]
                        : message.payload || {},
                );
            return;
        }

        if (supportedEvents.has(message.type)) {
            const payload = eventPayloadKeys[message.type]
                ? message.payload?.[eventPayloadKeys[message.type]]
                : message.payload;
            notifyListeners(message.type, payload);
        }
    }

    hostWindow.addEventListener('message', onMessage);

    function request(name, argument) {
        if (destroyed)
            return Promise.reject(new Error('Playground embed was destroyed'));
        const [type, makePayload, resultKey] = commands[name];
        const payload = makePayload ? makePayload(argument) : argument;
        const requestId = `host-${++nextRequestId}`;
        return new Promise((resolve, reject) => {
            const entry = {
                requestId,
                type,
                payload,
                resultKey,
                resolve,
                reject,
                timeout: hostWindow.setTimeout(() => {
                    rejectEntry(entry, `Request timed out: ${type}`);
                }, REQUEST_TIMEOUT),
            };
            if (ready) sendEntry(entry);
            else queued.push(entry);
        });
    }

    function on(type, callback) {
        if (!supportedEvents.has(type))
            throw new Error(`Unknown event: ${type}`);
        if (typeof callback !== 'function')
            throw new TypeError('Event listener must be a function');
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(callback);
        return () => listeners.get(type)?.delete(callback);
    }

    function destroy() {
        if (destroyed) return;
        destroyed = true;
        hostWindow.clearTimeout(readyTimeout);
        hostWindow.removeEventListener('message', onMessage);
        if (!ready) rejectReady(new Error('Playground embed was destroyed'));
        for (const entry of [...queued, ...pending.values()])
            rejectEntry(entry, 'Playground embed was destroyed');
        listeners.clear();
    }

    return {
        ready: readyPromise,
        get readyInfo() {
            return readyInfo;
        },
        on,
        loadProject: (project) => request('loadProject', project),
        getProject: () => request('getProject', {}),
        run: () => request('run', {}),
        stop: () => request('stop', {}),
        compile: () => request('compile', {}),
        clearOutput: () => request('clearOutput', {}),
        setOptions: (nextOptions) => request('setOptions', nextOptions),
        destroy,
    };
}

export { minizincPlayground };
