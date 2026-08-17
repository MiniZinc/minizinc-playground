import { render } from '@testing-library/svelte';
import { afterEach, expect, test } from 'vitest';
import Playground from '../../src/lib/Playground.svelte';
import { resetMock } from '../mocks/minizinc.js';

afterEach(() => resetMock());

// Every route a project takes out of the playground goes through postMessage:
// the embed client's getProject(), and the project-changed notification on each
// keystroke. postMessage structured-clones its payload, and a Svelte $state proxy
// cannot be cloned — so a project holding a nested reactive value fails to leave
// the iframe at all. The symptom is remote: the host silently records the wrong
// model source, or stops hearing about changes.
test('getProject returns something postMessage can clone', async () => {
    const { component } = render(Playground, {
        project: null,
        autoFocus: false,
        hideOutputOnStartup: false,
    });

    await component.loadProject({
        files: [
            {
                name: 'model.mzn',
                contents: 'int: n;\nvar 1..3: x;\nsolve satisfy;\n',
                readOnlyLines: [
                    [1, 1],
                    [3, 3],
                ],
            },
            { name: 'data.dzn', contents: 'n = 1;', useAsData: true },
        ],
        solverId: 'org.minizinc.gecode_presolver',
    });

    const project = component.getProject();
    expect(() => structuredClone(project)).not.toThrow();
    expect(structuredClone(project).files[0].readOnlyLines).toEqual([
        [1, 1],
        [3, 3],
    ]);
});
