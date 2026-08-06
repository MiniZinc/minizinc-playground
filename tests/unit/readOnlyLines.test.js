import { EditorState } from '@codemirror/state';
import { expect, test } from 'vitest';
import { readOnlyLines } from '../../src/lang/readOnlyLines.js';

function state(doc, ranges) {
    return EditorState.create({
        doc,
        extensions: readOnlyLines(ranges),
    });
}

function apply(current, from, to, insert) {
    return current.update({ changes: { from, to, insert } });
}

test('rejects changes to protected content but allows copying selections', () => {
    const current = state('one\ntwo\nthree', [
        [1, 1],
        [3, 3],
    ]);

    expect(apply(current, 0, 0, 'X').state.doc.toString()).toBe(
        'one\ntwo\nthree',
    );
    expect(apply(current, 4, 7, 'changed').state.doc.toString()).toBe(
        'one\nchanged\nthree',
    );
    expect(apply(current, 4, 4, '').state.doc.toString()).toBe(
        'one\ntwo\nthree',
    );
    expect(apply(current, 13, 13, 'X').state.doc.toString()).toBe(
        'one\ntwo\nthree',
    );
});

test('maps protected lines when an editable line gets a new line', () => {
    const current = state('one\ntwo\nthree', [
        [1, 1],
        [3, 3],
    ]);
    const update = apply(current, 7, 7, '\n');

    expect(update.state.doc.toString()).toBe('one\ntwo\n\nthree');
    expect(apply(update.state, 8, 8, 'X').state.doc.toString()).toBe(
        'one\ntwo\nX\nthree',
    );
    expect(apply(update.state, 9, 9, 'X').state.doc.toString()).toBe(
        'one\ntwo\n\nthree',
    );
});

test('allows Return after a protected line only before an editable line', () => {
    const current = state('one\ntwo\nthree', [
        [1, 1],
        [3, 3],
    ]);

    expect(apply(current, 3, 3, '\n').state.doc.toString()).toBe(
        'one\n\ntwo\nthree',
    );
    expect(apply(current, 7, 7, '\n').state.doc.toString()).toBe(
        'one\ntwo\n\nthree',
    );

    const consecutive = state('one\ntwo\nthree', [[2, 3]]);
    expect(apply(consecutive, 7, 7, '\n').state.doc.toString()).toBe(
        'one\ntwo\nthree',
    );
});

test('rejects deleting either boundary newline of a protected line', () => {
    const current = state('one\ntwo\nthree\nfour', [[2, 2]]);

    expect(apply(current, 3, 4, '').state.doc.toString()).toBe(
        'one\ntwo\nthree\nfour',
    );
    expect(apply(current, 7, 8, '').state.doc.toString()).toBe(
        'one\ntwo\nthree\nfour',
    );
});

test('allows an editable trailing empty line after a protected line', () => {
    const current = state('one\ntwo\n', [[2, 2]]);

    expect(apply(current, 8, 8, 'x').state.doc.toString()).toBe('one\ntwo\nx');
});

test('allows Return after an empty protected line before an editable line', () => {
    const current = state('one\n\ntwo', [[2, 2]]);

    expect(apply(current, 4, 4, 'x').state.doc.toString()).toBe('one\n\ntwo');
    expect(apply(current, 4, 4, '\n').state.doc.toString()).toBe(
        'one\n\n\ntwo',
    );
});
