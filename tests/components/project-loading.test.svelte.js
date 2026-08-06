import { render, waitFor } from '@testing-library/svelte';
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
