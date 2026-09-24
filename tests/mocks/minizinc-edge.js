import { Model as LatestModel } from './minizinc.js';

export * from './minizinc.js';

export async function version() {
    return 'MiniZinc version 4.5.1';
}

export class Model extends LatestModel {
    constructor() {
        super();
        this.runtime = 'edge';
    }
}
