import { render, waitFor } from '@testing-library/svelte';
import { afterEach, expect, test } from 'vitest';
import Playground from '../../src/lib/Playground.svelte';
import {
    getLastModel,
    getLastOperation,
    resetMock,
} from '../mocks/minizinc.js';

afterEach(() => resetMock());

test('runs the current model with its files', async () => {
    const { component } = render(Playground, {
        project: null,
        autoFocus: false,
        hideOutputOnStartup: false,
    });

    await component.loadProject({
        files: [
            { name: 'model.mzn', contents: 'solve satisfy;' },
            { name: 'data.dzn', contents: 'n = 1;', hidden: true },
        ],
        solverId: 'org.minizinc.gecode_presolver',
    });

    const run = component.run();
    await waitFor(() => expect(getLastOperation()).toBeTruthy());

    expect(getLastModel().files).toEqual([
        { name: 'model.mzn', contents: 'solve satisfy;', include: true },
        { name: 'data.dzn', contents: 'n = 1;', include: false },
    ]);
    expect(getLastOperation().options).toMatchObject({
        jsonOutput: false,
        options: { solver: 'org.minizinc.gecode_presolver' },
    });

    getLastOperation().emit('solution', {
        type: 'solution',
        output: { x: 1 },
        sections: [],
    });
    getLastOperation().resolve();
    await run;
});

test('keeps a generated FlatZinc file intact when it becomes the selected file', async () => {
    const projectChanges = [];
    const { component, container } = render(Playground, {
        project: null,
        autoFocus: false,
        hideOutputOnStartup: false,
        onprojectChanged: ({ project }) => projectChanges.push(project),
    });

    await component.loadProject({
        files: [{ name: 'model.mzn', contents: 'solve satisfy;' }],
        solverId: 'org.minizinc.gecode_presolver',
    });

    const compile = component.compile();
    await waitFor(() => expect(getLastOperation()).toBeTruthy());
    getLastOperation().resolve('var 1..1: x;');
    await compile;

    await waitFor(() => {
        expect(container.querySelector('.cm-content')).toHaveTextContent(
            'var 1..1: x;',
        );
    });
    expect(projectChanges.at(-1).files).toEqual([
        { name: 'model.mzn', contents: 'solve satisfy;' },
        { name: 'model.fzn', contents: 'var 1..1: x;' },
    ]);
});
