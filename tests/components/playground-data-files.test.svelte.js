import { render, screen } from '@testing-library/svelte';
import { afterEach, expect, test } from 'vitest';
import Playground from '../../src/lib/Playground.svelte';
import {
    getLastOperation,
    resetMock,
    setUndefinedParameters,
} from '../mocks/minizinc.js';

afterEach(() => resetMock());

const MODEL = { name: 'model.mzn', contents: 'int: n;\nsolve satisfy;' };
const DATA = { name: 'data.dzn', contents: 'n = 1;' };
// The same data file as the project records it, as the run uses it, and as the
// run ignores it.
const SELECTED_DATA = { ...DATA, useAsData: true };
const USED_DATA = { ...DATA, include: true };
const UNUSED_DATA = { ...DATA, include: false };

/**
 * Declare which parameters each data file defines. Anything left over by the
 * files on the command line is reported as undefined, which is what makes the
 * playground ask the user for an instance.
 * @param {Record<string, string[]>} defines
 */
function parametersDefinedBy(defines) {
    setUndefinedParameters((commandLine) => {
        const defined = new Set(
            commandLine.flatMap((name) => defines[name] || []),
        );
        return Object.fromEntries(
            Object.values(defines)
                .flat()
                .filter((parameter) => !defined.has(parameter))
                .map((parameter) => [parameter, { type: 'int' }]),
        );
    });
}

function mount() {
    return render(Playground, {
        project: null,
        autoFocus: false,
        hideOutputOnStartup: false,
    });
}

/** @param {Record<string, any>} [data] The data file, with or without useAsData. */
function project(data = DATA) {
    return {
        files: [MODEL, data],
        solverId: 'org.minizinc.gecode_presolver',
    };
}

// Wait for a run that is not the one we already saw. Runs are only
// distinguishable by identity, so asserting on getLastOperation() alone would
// happily pass against the previous run's operation.
//
// Two things here are deliberate. It polls rather than using waitFor, because
// starting a run is two awaited compiles with no DOM mutation in between and
// waitFor retries on mutation. And it returns the operation *wrapped*: an
// operation is a promise, and returning one from an async function chains onto
// it, so a bare `return operation` waits for a resolution only the caller can
// supply — the test deadlocks until it times out.
async function nextRun(previous) {
    for (let attempt = 0; attempt < 100; attempt++) {
        const operation = getLastOperation();
        if (operation && operation !== previous) {
            return { operation };
        }
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
    throw new Error('no new run was started');
}

function chooseDataFile(name) {
    const option = screen.getByRole('option', { name });
    option.selected = true;
    option.parentElement.dispatchEvent(new Event('change', { bubbles: true }));
    screen.getByRole('button', { name: 'OK' }).click();
}

test('a file marked useAsData is used without asking', async () => {
    parametersDefinedBy({ 'data.dzn': ['n'] });
    const { component } = mount();
    await component.loadProject(project(SELECTED_DATA));

    const run = component.run();
    const { operation } = await nextRun(undefined);

    expect(operation.model.files).toEqual([
        { ...MODEL, include: true },
        USED_DATA,
    ]);
    expect(screen.queryByText('Model parameters')).toBeNull();
    operation.resolve();
    await run;
});

test('the answer is reused, so the modal appears once and not again', async () => {
    parametersDefinedBy({ 'data.dzn': ['n'] });
    const { component } = mount();
    await component.loadProject(project());

    // Nothing is marked yet, so the first run has to ask.
    const first = component.run();
    await screen.findByText('Model parameters');
    chooseDataFile('data.dzn');
    const { operation: firstOperation } = await nextRun(undefined);
    expect(firstOperation.model.files).toContainEqual(USED_DATA);
    firstOperation.resolve();
    await first;

    // The answer was recorded on the file, so the second run already knows it.
    expect(component.getProject().files).toContainEqual(SELECTED_DATA);
    const second = component.run();
    const { operation: secondOperation } = await nextRun(firstOperation);
    expect(secondOperation.model.files).toContainEqual(USED_DATA);
    expect(screen.queryByText('Model parameters')).toBeNull();
    secondOperation.resolve();
    await second;
});

test('a selection that leaves a parameter undefined still asks', async () => {
    // No data file defines `m`, so no selection can be sufficient.
    parametersDefinedBy({ 'data.dzn': ['n'], 'other.dzn': ['m'] });
    const { component } = mount();
    await component.loadProject(project(SELECTED_DATA));

    const run = component.run();
    await screen.findByText('Model parameters');

    // The standing selection is offered back rather than discarded.
    expect(screen.getByRole('option', { name: 'data.dzn' }).selected).toBe(
        true,
    );

    screen.getByRole('button', { name: 'Cancel' }).click();
    await run;
    expect(getLastOperation()).toBeUndefined();
});

test('a self-contained model never gains the marked data file', async () => {
    // Nothing is undefined, so the data file must stay off the command line —
    // otherwise a model carrying its own data would be given it twice.
    const { component } = mount();
    await component.loadProject(project(SELECTED_DATA));

    const run = component.run();
    const { operation } = await nextRun(undefined);

    expect(operation.model.files).toContainEqual(UNUSED_DATA);
    operation.resolve();
    await run;
});

test('useAsData round-trips through getProject', async () => {
    const { component } = mount();
    await component.loadProject(project(SELECTED_DATA));

    expect(component.getProject().files).toEqual([MODEL, SELECTED_DATA]);
});

test('getProject omits useAsData when nothing is marked', async () => {
    const { component } = mount();
    await component.loadProject(project());

    expect(component.getProject().files).toEqual([MODEL, DATA]);
});

test('loading a project clears the previous selection', async () => {
    const { component } = mount();
    await component.loadProject(project(SELECTED_DATA));
    await component.loadProject(project());

    expect(component.getProject().files).toEqual([MODEL, DATA]);
});
