export function shutdown() {}

export async function init() {}

const models = [];
const operations = [];

let undefinedParameters = () => ({});

export function resetMock() {
    models.length = 0;
    operations.length = 0;
    undefinedParameters = () => ({});
}

/**
 * Control what `Model.interface()` reports as still-undefined parameters.
 *
 * The callback is given the names of the files on the model's command line, so a
 * test can say "n is undefined unless data.dzn is being used" and exercise the
 * code that decides whether to ask the user for an instance.
 *
 * @param {(files: string[]) => Record<string, any>} fn
 */
export function setUndefinedParameters(fn) {
    undefinedParameters = typeof fn === 'function' ? fn : () => ({});
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

    // Mirrors the real Model.addFile: every file lands in the virtual filesystem,
    // and `include` decides whether it is also on the command line. Calling it
    // again for a known file with no contents just puts that file on the command
    // line, which is how the playground promotes a data file to a run.
    addFile(name, contents, include = true) {
        const existing = this.files.find((f) => f.name === name);
        if (typeof contents !== 'string') {
            if (!existing) {
                throw new Error('Missing file contents argument');
            }
            existing.include = existing.include || include;
            return;
        }
        if (existing) {
            existing.contents = contents;
            existing.include = include;
            return;
        }
        this.files.push({ name, contents, include });
    }

    addString(contents) {
        this.string = contents;
        return 'model.mzn';
    }

    addDznString(contents) {
        const name = `_dzn_${this.files.length}.dzn`;
        this.addFile(name, contents);
        return name;
    }

    async check() {
        return [];
    }

    async interface() {
        const commandLine = this.files
            .filter((f) => f.include)
            .map((f) => f.name);
        return { input: undefinedParameters(commandLine) };
    }

    solve(options) {
        const operation = createOperation(options, this);
        operations.push(operation);
        return operation;
    }

    compile(options) {
        const operation = createOperation(options, this);
        operations.push(operation);
        return operation;
    }
}

function createOperation(options, model) {
    let resolvePromise;
    let rejectPromise;
    const listeners = new Map();
    const promise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });
    promise.options = options;
    // The model this run came from. A run may be assembled more than once before
    // one is chosen, so this is more reliable than getLastModel().
    promise.model = model;
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
