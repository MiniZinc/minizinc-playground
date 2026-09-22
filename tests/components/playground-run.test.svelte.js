import { render, waitFor } from '@testing-library/svelte';
import { afterEach, expect, test, vi } from 'vitest';
vi.mock('../../src/lib/shackle.js', () => ({ transpile: vi.fn() }));
import Playground from '../../src/lib/Playground.svelte';
import { transpile } from '../../src/lib/shackle.js';
import {
    getLastModel,
    getLastOperation,
    resetMock,
    setUndefinedParameters,
} from '../mocks/minizinc.js';

afterEach(() => {
    resetMock();
    vi.resetAllMocks();
});

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

test('uses transpiled text only for the selected model during a Shackle run', async () => {
    transpile.mockResolvedValue({
        ok: true,
        model: 'int: flattened = 1;\nsolve satisfy;',
        warnings: [],
    });
    const { component } = render(Playground, {
        project: null,
        autoFocus: false,
        hideOutputOnStartup: false,
        shackleEnabled: true,
    });
    await component.loadProject({
        files: [
            {
                name: 'model.mzn',
                contents: 'include "part.mzn"; solve satisfy;',
            },
            { name: 'part.mzn', contents: 'int: original = 1;' },
            { name: 'data.dzn', contents: 'n = 1;', useAsData: true },
        ],
        solverId: 'org.minizinc.gecode_presolver',
    });
    setUndefinedParameters((fileList) =>
        fileList.includes('data.dzn') ? {} : { n: {} },
    );

    const run = component.run();
    await waitFor(() => expect(getLastOperation()).toBeTruthy());

    expect(transpile).toHaveBeenCalledWith({
        entry: 'model.mzn',
        target: 'minizinc',
        files: {
            'model.mzn': 'include "part.mzn"; solve satisfy;',
            'part.mzn': 'int: original = 1;',
            'data.dzn': 'n = 1;',
        },
    });
    expect(getLastOperation().model.files).toEqual([
        {
            name: 'model.mzn',
            contents: 'int: flattened = 1;\nsolve satisfy;',
            include: true,
        },
        { name: 'part.mzn', contents: 'int: original = 1;', include: false },
        { name: 'data.dzn', contents: 'n = 1;', include: true },
    ]);
    getLastOperation().resolve();
    await run;
});

test('disables Run and Compile while Shackle transpilation is pending', async () => {
    let resolveTranspile;
    transpile.mockImplementation(
        () => new Promise((resolve) => (resolveTranspile = resolve)),
    );
    const { component, container } = render(Playground, {
        project: null,
        autoFocus: false,
        hideOutputOnStartup: false,
        shackleEnabled: true,
    });
    await component.loadProject({
        files: [{ name: 'model.mzn', contents: 'solve satisfy;' }],
        solverId: 'org.minizinc.gecode_presolver',
    });

    const run = component.run();
    await waitFor(() => expect(transpile).toHaveBeenCalledOnce());
    expect(
        container.querySelector('[title="Run the current file"]'),
    ).toBeDisabled();
    expect(container.querySelector('[title^="Compile"]')).toBeDisabled();

    resolveTranspile({ ok: true, model: 'solve satisfy;', warnings: [] });
    await waitFor(() => expect(getLastOperation()).toBeTruthy());
    getLastOperation().resolve();
    await run;
});

test('passes the selected MicroZinc target to Shackle', async () => {
    transpile.mockResolvedValue({
        ok: true,
        model: 'solve satisfy;',
        warnings: [],
    });
    const { component, container } = render(Playground, {
        project: null,
        autoFocus: false,
        hideOutputOnStartup: false,
        shackleEnabled: true,
    });
    await component.loadProject({
        files: [{ name: 'model.mzn', contents: 'solve satisfy;' }],
        solverId: 'org.minizinc.gecode_presolver',
    });

    container
        .querySelector('[title="Configure transpilation target"] button')
        .click();
    [...container.querySelectorAll('.dropdown-item')]
        .find((item) => item.textContent.includes('MicroZinc'))
        .click();

    const run = component.run();
    await waitFor(() => expect(getLastOperation()).toBeTruthy());
    expect(transpile).toHaveBeenCalledWith({
        entry: 'model.mzn',
        target: 'microzinc',
        files: { 'model.mzn': 'solve satisfy;' },
    });
    getLastOperation().resolve();
    await run;
});

test('reports Shackle diagnostics without calling the native solver', async () => {
    transpile.mockResolvedValue({
        ok: false,
        diagnostics: [
            {
                message: 'Syntax Error',
                filename: 'model.mzn',
                line: 2,
                column: 3,
                length: 1,
            },
        ],
        warnings: [],
    });
    const onrunError = vi.fn();
    const { component, container } = render(Playground, {
        project: null,
        autoFocus: false,
        hideOutputOnStartup: false,
        shackleEnabled: true,
        onrunError,
    });
    await component.loadProject({
        files: [{ name: 'model.mzn', contents: 'broken' }],
        solverId: 'org.minizinc.gecode_presolver',
    });

    await component.run();
    expect(getLastOperation()).toBeFalsy();
    expect(onrunError).toHaveBeenCalledWith({
        files: ['model.mzn'],
        error: { message: 'Syntax Error' },
    });
    expect(container).toHaveTextContent('Syntax Error');
});

test('compiles Shackle source to a runnable generated model without retranspiling it', async () => {
    transpile.mockResolvedValue({
        ok: true,
        model: 'int: lowered = 1;\nsolve satisfy;',
        warnings: [],
    });
    const { component, container } = render(Playground, {
        project: null,
        autoFocus: false,
        hideOutputOnStartup: false,
        shackleEnabled: true,
    });
    await component.loadProject({
        files: [{ name: 'model.mzn', contents: 'solve satisfy;' }],
        solverId: 'org.minizinc.gecode_presolver',
    });

    await component.compile();
    await waitFor(() => {
        expect(container.querySelector('.cm-content')).toHaveTextContent(
            'int: lowered = 1;',
        );
    });
    expect(container.querySelector('[title^="Compile"]')).toBeDisabled();
    expect(transpile).toHaveBeenCalledTimes(1);

    const run = component.run();
    await waitFor(() => expect(getLastOperation()).toBeTruthy());
    expect(transpile).toHaveBeenCalledTimes(1);
    expect(
        getLastOperation().model.files.find(
            (file) => file.name === 'model.shackle.mzn',
        ),
    ).toEqual({
        name: 'model.shackle.mzn',
        contents: 'int: lowered = 1;\nsolve satisfy;',
        include: true,
    });
    getLastOperation().resolve();
    await run;
});
