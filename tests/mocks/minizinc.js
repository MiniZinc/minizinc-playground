export function shutdown() {}

export async function init() {}

const models = [];
const operations = [];

export function resetMock() {
    models.length = 0;
    operations.length = 0;
}

export function getLastModel() {
    return models.at(-1);
}

export function getLastOperation() {
    return operations.at(-1);
}

export async function version() {
    return 'MiniZinc version 4.5.0';
}

export async function solvers() {
    return [
        {
            id: 'org.minizinc.gecode_presolver',
            name: 'Gecode',
            version: ' 6.3',
            extraInfo: { isDefault: true },
            stdFlags: [],
        },
    ];
}

export class Model {
    constructor() {
        this.files = [];
        models.push(this);
    }

    addFile(name, contents, include = undefined) {
        this.files.push({ name, contents, include });
    }

    addString(contents) {
        this.string = contents;
        return 'model.mzn';
    }

    async check() {
        return [];
    }

    async interface() {
        return { input: {} };
    }

    solve(options) {
        const operation = createOperation(options);
        operations.push(operation);
        return operation;
    }

    compile(options) {
        const operation = createOperation(options);
        operations.push(operation);
        return operation;
    }
}

function createOperation(options) {
    let resolvePromise;
    let rejectPromise;
    const listeners = new Map();
    const promise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });
    promise.options = options;
    promise.on = (event, callback) => {
        const callbacks = listeners.get(event) || [];
        callbacks.push(callback);
        listeners.set(event, callbacks);
        return promise;
    };
    promise.emit = (event, value) => {
        for (const callback of listeners.get(event) || []) callback(value);
    };
    promise.resolve = (value = '') => resolvePromise(value);
    promise.reject = (error) => rejectPromise(error);
    promise.cancel = () =>
        rejectPromise(Object.assign(new Error('cancelled'), { code: 1 }));
    return promise;
}

export async function readStdlibFileContents() {
    return null;
}
