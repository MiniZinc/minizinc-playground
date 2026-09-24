import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { afterEach, expect, test, vi } from 'vitest';
import { getExtensions } from '../../src/lang/index.js';

afterEach(() => {
    vi.useRealTimers();
});

test('cancels a pending code check when its editor is destroyed', async () => {
    vi.useFakeTimers();
    const codeCheck = vi.fn();
    const parent = document.createElement('div');
    const view = new EditorView({
        parent,
        state: EditorState.create({
            doc: 'int: x;',
            extensions: getExtensions('.mzn', codeCheck, false),
        }),
    });

    view.dispatch({
        changes: { from: view.state.doc.length, insert: '\nint: y;' },
    });
    view.destroy();

    await vi.advanceTimersByTimeAsync(250);

    expect(codeCheck).not.toHaveBeenCalled();
    parent.remove();
});
