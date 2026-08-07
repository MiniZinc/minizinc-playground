import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import Playground from '../../src/lib/Playground.svelte';

const project = (name, contents) => ({
    files: [{ name, contents }],
    solverId: 'org.minizinc.gecode_presolver',
});

test('replaces the CodeMirror document when a new project is loaded', async () => {
    const { component, container } = render(Playground, {
        project: null,
        autoFocus: false,
    });
    const firstProject = project('first.mzn', 'int: first = 1;');
    const secondProject = project('second.mzn', 'int: second = 2;');

    await component.loadProject(firstProject);
    await component.loadProject(secondProject);

    await waitFor(() => {
        expect(container.querySelector('.cm-content')).toHaveTextContent(
            secondProject.files[0].contents,
        );
    });
    expect(component.getProject().files).toEqual([
        { name: 'second.mzn', contents: 'int: second = 2;' },
    ]);
});

test('loads and preserves read-only line ranges', async () => {
    const { component, container } = render(Playground, {
        project: null,
        autoFocus: false,
    });
    const loadedProject = {
        files: [
            {
                name: 'model.mzn',
                contents: 'generated\neditable\nprotected',
                readOnlyLines: [
                    [1, 1],
                    [3, 3],
                ],
            },
        ],
        solverId: 'org.minizinc.gecode_presolver',
    };

    await component.loadProject(loadedProject);

    await waitFor(() => {
        expect(
            container.querySelectorAll('.cm-mzn-read-only-line'),
        ).toHaveLength(2);
    });
    expect(component.getProject().files[0].readOnlyLines).toEqual([
        [1, 1],
        [3, 3],
    ]);
});

test('keeps the selected replacement file intact when deleting the open file', async () => {
    const projectChanges = [];
    const { component, container } = render(Playground, {
        project: null,
        autoFocus: false,
        onprojectChanged: ({ project }) => projectChanges.push(project),
    });
    await component.loadProject({
        files: [
            { name: 'first.mzn', contents: 'int: first = 1;' },
            { name: 'second.mzn', contents: 'int: second = 2;' },
        ],
        solverId: 'org.minizinc.gecode_presolver',
    });

    await fireEvent.click(container.querySelector('.close-tab'));
    await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
        expect(container.querySelector('.cm-content')).toHaveTextContent(
            'int: second = 2;',
        );
    });
    expect(component.getProject().files).toEqual([
        { name: 'second.mzn', contents: 'int: second = 2;' },
    ]);
    expect(projectChanges.at(-1).files).toEqual([
        { name: 'second.mzn', contents: 'int: second = 2;' },
    ]);
});

test('keeps the selected replacement file intact when hiding the open file', async () => {
    const projectChanges = [];
    const { component, container } = render(Playground, {
        project: null,
        autoFocus: false,
        onprojectChanged: ({ project }) => projectChanges.push(project),
    });
    await component.loadProject({
        files: [
            { name: 'first.mzn', contents: 'int: first = 1;' },
            { name: 'second.mzn', contents: 'int: second = 2;' },
        ],
        solverId: 'org.minizinc.gecode_presolver',
    });

    await fireEvent.click(screen.getByTitle('Manage files'));
    await fireEvent.click(screen.getAllByTitle('Click to hide this file')[0]);

    await waitFor(() => {
        expect(container.querySelector('.cm-content')).toHaveTextContent(
            'int: second = 2;',
        );
    });
    expect(projectChanges.at(-1).files).toEqual([
        { name: 'first.mzn', contents: 'int: first = 1;', hidden: true },
        { name: 'second.mzn', contents: 'int: second = 2;' },
    ]);
});

test('keeps an imported file intact when it becomes the selected file', async () => {
    const projectChanges = [];
    const { component, container } = render(Playground, {
        project: null,
        autoFocus: false,
        onprojectChanged: ({ project }) => projectChanges.push(project),
    });
    await component.loadProject({
        files: [{ name: 'first.mzn', contents: 'int: first = 1;' }],
        solverId: 'org.minizinc.gecode_presolver',
    });

    await fireEvent.click(screen.getByTitle('Add new file'));
    const input = container.querySelector('input[type="file"]');
    await fireEvent.change(input, {
        target: {
            files: [
                new File(['int: imported = 2;'], 'imported.mzn', {
                    type: 'text/plain',
                }),
            ],
        },
    });

    await waitFor(() => {
        expect(container.querySelector('.cm-content')).toHaveTextContent(
            'int: imported = 2;',
        );
        expect(projectChanges.at(-1).files).toHaveLength(2);
    });
    expect(projectChanges.at(-1).files).toEqual([
        { name: 'first.mzn', contents: 'int: first = 1;' },
        { name: 'imported.mzn', contents: 'int: imported = 2;' },
    ]);
});

test('does not serialise stale editor state during a tab change', async () => {
    const { component, container } = render(Playground, {
        project: null,
        autoFocus: false,
    });
    await component.loadProject({
        files: [
            { name: 'first.mzn', contents: 'int: first = 1;' },
            { name: 'second.mzn', contents: 'int: second = 2;' },
        ],
        solverId: 'org.minizinc.gecode_presolver',
    });

    fireEvent.click(screen.getByText('second.mzn'));
    expect(component.getProject().files).toEqual([
        { name: 'first.mzn', contents: 'int: first = 1;' },
        { name: 'second.mzn', contents: 'int: second = 2;' },
    ]);

    await waitFor(() => {
        expect(container.querySelector('.cm-content')).toHaveTextContent(
            'int: second = 2;',
        );
    });
});
