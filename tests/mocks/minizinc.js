export function shutdown() {}

export async function init() {}

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
    addFile() {}

    addString() {
        return 'model.mzn';
    }

    async check() {
        return [];
    }
}

export async function readStdlibFileContents() {
    return null;
}
