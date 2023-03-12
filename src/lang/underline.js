import { EditorView, Decoration } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';

const addUnderline = StateEffect.define({
    /**
     * @param {{from: number, to: number, msg: string, type: string}} e
     */
    map: (e, change) => ({
        from: change.mapPos(e.from),
        to: change.mapPos(e.to),
        msg: e.msg,
        type: e.type,
    }),
});

const clearUnderlines = StateEffect.define();

const underlineField = StateField.define({
    create() {
        return Decoration.none;
    },
    update(underlines, tr) {
        underlines = underlines.map(tr.changes);
        for (const e of tr.effects) {
            if (e.is(clearUnderlines)) {
                underlines = Decoration.none;
            }
            if (e.is(addUnderline)) {
                underlines = underlines.update({
                    add: [
                        Decoration.mark({
                            class: `cm-mzn-underline-${e.value.type}`,
                            attributes: { title: e.value.msg },
                        }).range(e.value.from, e.value.to),
                    ],
                });
            }
        }
        return underlines;
    },
    provide: (f) => EditorView.decorations.from(f),
});

/**
 * Convert a line/char to a position in the string
 * @param {number} line
 * @param {number} char
 * @param {string} text
 * @returns {number}
 */
export function lineCharToPos(line, char, text) {
    let i;
    let r = 1;
    let c = 1;
    for (i = 0; i < text.length; i++) {
        if (r >= line && c >= char) {
            return i;
        }
        c++;
        if (text[i] === '\n') {
            r++;
            c = 1;
        }
    }
    return i;
}

/**
 *
 * @param {*[]} msgs
 * @param {EditorView} view
 */
export function addErrors(text, msgs, view) {
    const effects = msgs.map((msg) =>
        addUnderline.of({
            from: lineCharToPos(
                msg.location.firstLine,
                msg.location.firstColumn,
                text
            ),
            to:
                lineCharToPos(
                    msg.location.lastLine,
                    msg.location.lastColumn,
                    text
                ) + 1,
            msg: `${msg.type === 'error' ? 'Error' : 'Warning'}: ${msg.what}: ${
                msg.message
            }`,
            type: msg.type,
        })
    );
    if (!view.state.field(underlineField, false)) {
        effects.push(
            // @ts-ignore
            StateEffect.appendConfig.of([underlineField])
        );
    }
    view.dispatch({ effects: [clearUnderlines.of(null), ...effects] });
}
