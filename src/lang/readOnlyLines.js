import { EditorState, StateField } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';

const readOnlyLineMark = Decoration.line({
    class: 'cm-mzn-read-only-line',
});

/**
 * Turn 1-based inclusive line ranges into document-position spans.
 *
 * The input is deliberately assumed to have already been validated by the
 * project format. Each line is kept separately so that inserted lines can be
 * mapped without losing the identity of later protected lines.
 */
/**
 * @param {import('@codemirror/state').Text} doc
 * @param {Array<[number, number]>} ranges
 */
function lineSpans(doc, ranges) {
    const spans = [];
    for (const [first, last] of ranges || []) {
        for (let number = first; number <= last; number++) {
            const line = doc.line(number);
            spans.push({ from: line.from, to: line.to });
        }
    }
    return spans;
}

/**
 * @param {import('@codemirror/state').Text} doc
 * @param {Array<{ from: number, to: number }>} spans
 */
function decorationsFor(doc, spans) {
    return Decoration.set(
        spans.map((span) => readOnlyLineMark.range(doc.lineAt(span.from).from)),
        true,
    );
}

/**
 * @param {import('@codemirror/state').Text} inserted
 * @param {import('@codemirror/state').EditorState} state
 */
function isSingleLineBreak(inserted, state) {
    return inserted.toString() === state.lineBreak;
}

/** @param {number} from @param {number} to @param {number} rangeFrom @param {number} rangeTo */
function intersects(from, to, rangeFrom, rangeTo) {
    return from < rangeTo && to > rangeFrom;
}

/** @param {number} pos @param {number} from @param {number} to */
function pointInRange(pos, from, to) {
    return from === to ? pos === from : pos >= from && pos < to;
}

/**
 * @param {Array<{ lineNumber: number }>} spans
 * @param {number} lineNumber
 */
function isProtectedLine(spans, lineNumber) {
    return spans.some((span) => span.lineNumber === lineNumber);
}

/**
 * Return true when a change is allowed by the protected line rules.
 *
 * Changes are evaluated in the original document coordinate space. A
 * newline inserted at the end of a protected line is the one exception to
 * the normal protected-content rule: it is equivalent to pressing Return at
 * the start of the following editable line.
 */
/**
 * @param {import('@codemirror/state').EditorState} state
 * @param {Array<{ from: number, to: number }>} spans
 * @param {import('@codemirror/state').ChangeSet} changes
 */
export function changesAllowed(state, spans, changes) {
    const lineSpansWithNumbers = spans.map((span) => ({
        ...span,
        lineNumber: state.doc.lineAt(span.from).number,
    }));

    let allowed = true;
    changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
        if (!allowed) return;

        const isInsertion = fromA === toA;
        for (const span of lineSpansWithNumbers) {
            const line = state.doc.lineAt(span.from);
            const nextLine =
                line.number < state.doc.lines
                    ? state.doc.line(line.number + 1)
                    : null;
            const nextIsProtected = nextLine
                ? isProtectedLine(lineSpansWithNumbers, line.number + 1)
                : false;

            // Return at the end of a protected line is treated as Return at
            // the start of the following editable line.
            if (
                isInsertion &&
                fromA === span.to &&
                isSingleLineBreak(inserted, state)
            ) {
                if (nextLine && !nextIsProtected) {
                    continue;
                }
                allowed = false;
                return;
            }

            // The end position is still inside the protected line for normal
            // text insertion. Only the explicitly handled Return operation
            // above may use that position.
            if (isInsertion && fromA === span.to) {
                allowed = false;
                return;
            }

            // A protected line's content, including an empty line's point,
            // cannot be changed.
            if (
                (isInsertion && pointInRange(fromA, span.from, span.to)) ||
                (!isInsertion && intersects(fromA, toA, span.from, span.to))
            ) {
                allowed = false;
                return;
            }

            if (!isInsertion) {
                // Deleting either adjacent line separator would merge a
                // protected line with another line.
                if (line.number > 1) {
                    const previous = state.doc.line(line.number - 1);
                    if (intersects(fromA, toA, previous.to, line.from)) {
                        allowed = false;
                        return;
                    }
                }
                if (nextLine) {
                    if (intersects(fromA, toA, line.to, nextLine.from)) {
                        allowed = false;
                        return;
                    }
                }
            }
        }
    });
    return allowed;
}

/**
 * Create the CodeMirror extensions for a file's protected line ranges.
 *
 * @param {Array<[number, number]>} ranges
 */
export function readOnlyLines(ranges = []) {
    let field;
    field = StateField.define({
        create(state) {
            const spans = lineSpans(state.doc, ranges);
            return { spans, decorations: decorationsFor(state.doc, spans) };
        },
        update(value, transaction) {
            if (!transaction.docChanged) return value;
            const spans = value.spans.map((span) => ({
                from: transaction.changes.mapPos(span.from, 1),
                to: transaction.changes.mapPos(span.to, -1),
            }));
            return {
                spans,
                decorations: decorationsFor(transaction.newDoc, spans),
            };
        },
        provide: (field) =>
            EditorView.decorations.from(field, (value) => value.decorations),
    });

    return [
        field,
        EditorState.changeFilter.of((transaction) =>
            changesAllowed(
                transaction.startState,
                transaction.startState.field(field).spans,
                transaction.changes,
            ),
        ),
    ];
}
