import { render, waitFor } from '@testing-library/svelte';
import { EditorView } from '@codemirror/view';
import { expect, test } from 'vitest';
import Playground from '../../src/lib/Playground.svelte';

const project = {
    files: [{ name: 'model.mzn', contents: 'int: x = 1;' }],
    solverId: 'org.minizinc.gecode_presolver',
};

/** Type into the rendered CodeMirror instance the way a user would. */
function typeIntoEditor(container, text) {
    const view = EditorView.findFromDOM(container.querySelector('.cm-editor'));
    view.dispatch({
        changes: { from: view.state.doc.length, insert: text },
        userEvent: 'input.type',
    });
    return view;
}

test('reports a project change when the editor document is edited', async () => {
    const changes = [];
    const { component, container } = render(Playground, {
        project: null,
        autoFocus: false,
        onprojectChanged: ({ project }) => changes.push(project),
    });

    await component.loadProject(project);
    await waitFor(() => {
        expect(container.querySelector('.cm-content')).toHaveTextContent(
            'int: x = 1;',
        );
    });
    changes.length = 0;

    typeIntoEditor(container, '\nint: y = 2;');

    await waitFor(() => expect(changes.length).toBeGreaterThan(0));
    expect(changes[changes.length - 1].files[0].contents).toBe(
        'int: x = 1;\nint: y = 2;',
    );
});

test('the reported project matches getProject()', async () => {
    const changes = [];
    const { component, container } = render(Playground, {
        project: null,
        autoFocus: false,
        onprojectChanged: ({ project }) => changes.push(project),
    });

    await component.loadProject(project);
    await waitFor(() => {
        expect(container.querySelector('.cm-content')).toHaveTextContent(
            'int: x = 1;',
        );
    });

    typeIntoEditor(container, '\nint: y = 2;');

    await waitFor(() => expect(changes.length).toBeGreaterThan(0));
    expect(changes[changes.length - 1].files).toEqual(
        component.getProject().files,
    );
});
