import { parser } from './minizinc.grammar';
import { basicSetup } from 'codemirror';
import { Compartment } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { indentLess, indentMore } from '@codemirror/commands';
import { createTheme } from 'thememirror';
import {
    LRLanguage,
    LanguageSupport,
    indentNodeProp,
    foldNodeProp,
    foldInside,
    delimitedIndent,
} from '@codemirror/language';
import { styleTags, tags as t } from '@lezer/highlight';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { debounce } from 'lodash';

export const MiniZincLanguage = LRLanguage.define({
    parser: parser.configure({
        props: [
            indentNodeProp.add({
                ParenthesisedExpression: delimitedIndent({
                    closing: ')',
                    align: false,
                }),
                Application: delimitedIndent({ closing: ')', align: false }),
                GeneratorCallGenerators: delimitedIndent({
                    closing: ')',
                    align: false,
                }),
                LetItems: delimitedIndent({ closing: '}', align: false }),
                ArrayLiteral: delimitedIndent({ closing: ']', align: false }),
                ArrayLiteral2d: delimitedIndent({
                    closing: '|]',
                    align: false,
                }),
                SetLiteral: delimitedIndent({ closing: '}', align: false }),
            }),
            foldNodeProp.add({
                ParenthesisedExpression: foldInside,
                Application: foldInside,
                GeneratorCallGenerators: foldInside,
                LetItems: foldInside,
                ArrayLiteral: foldInside,
                ArrayLiteral2d: foldInside,
                SetLiteral: foldInside,
            }),
            styleTags({
                Keyword: t.keyword,
                'Identifier QuotedIdentifier': t.variableName,
                'Call/Identifier Call/QuotedIdentifier GeneratorCall/Identifier GeneratorCall/QuotedIdentifier':
                    t.name,
                Absent: t.null,
                Anonymous: t.null,
                BooleanLiteral: t.bool,
                Number: t.number,
                Infinity: t.number,
                StringLiteral: t.string,
                LineComment: t.comment,
                BlockComment: t.comment,
                '( )': t.paren,
                '{ }': t.paren,
                '[ ]': t.paren,
            }),
        ],
    }),
    languageData: {
        commentTokens: { line: '%' },
    },
});

export function MiniZinc() {
    return new LanguageSupport(MiniZincLanguage);
}

const lightTheme = createTheme({
    variant: 'light',
    settings: {
        background: '#fff',
        foreground: '#000',
        caret: '#000',
        selection: '#036dd626',
        gutterBackground: '#fcfcfc',
        gutterForeground: '#999',
        lineHighlight: '#90909020',
    },
    styles: [
        {
            tag: t.comment,
            color: 'slategray',
        },
        {
            tag: t.string,
            color: '#690',
        },
        {
            tag: [t.number, t.bool, t.null],
            color: '#905',
        },
        {
            tag: t.variableName,
            color: '#000000',
        },
        {
            tag: t.name,
            color: '#07a',
        },
        {
            tag: [t.keyword],
            color: '#07a',
        },
    ],
});

const darkTheme = createTheme({
    variant: 'dark',
    settings: {
        background: 'var(--bulma-scheme-main-bis)',
        foreground: '#F6F6F6',
        caret: '#EEE',
        selection: '#036dd626',
        gutterBackground: 'var(--bulma-scheme-main-ter)',
        gutterForeground: 'var(--bulma-text)',
        lineHighlight: '#90909014',
    },
    styles: [
        {
            tag: t.comment,
            color: 'slategray',
        },
        {
            tag: t.string,
            color: '#e09177',
        },
        {
            tag: [t.number, t.bool, t.null],
            color: '#a9e07e',
        },
        {
            tag: t.variableName,
            color: '#FFFFFF',
        },
        {
            tag: t.name,
            color: '#e6cf77',
        },
        {
            tag: [t.keyword],
            color: '#54a2e3',
        },
    ],
});

const theme = new Compartment();
const editable = new Compartment();

export const readOnlyEffect = editable.reconfigure(
    EditorView.editable.of(false),
);
export const editableEffect = editable.reconfigure(
    EditorView.editable.of(true),
);
export const lightThemeEffect = theme.reconfigure(lightTheme);
export const darkThemeEffect = theme.reconfigure(darkTheme);

export function getExtensions(suffix, codeCheck, darkMode, readOnly = false) {
    const extensions = [
        basicSetup,
        keymap.of([
            {
                key: 'Tab',
                preventDefault: true,
                run: ({ state, dispatch }) => {
                    if (state.selection.ranges.some((r) => !r.empty)) {
                        return indentMore({ state, dispatch });
                    }
                    dispatch(
                        state.update(state.replaceSelection('  '), {
                            scrollIntoView: true,
                            userEvent: 'input',
                        }),
                    );
                    return true;
                },
            },
            {
                key: 'Shift-Tab',
                preventDefault: true,
                run: indentLess,
            },
        ]),
        theme.of(darkMode ? darkTheme : lightTheme),
        EditorView.theme({
            '&': { height: '100%' },
            '&.cm-editor.cm-focused': { outline: 'none' },
            '.cm-content, .cm-gutter': { minHeight: '100%' },
            '&.cm-focused .cm-selectionBackground': {
                backgroundColor: '#036dd638',
            },
        }),
    ];

    if (suffix === '.json' || suffix === '.mpc') {
        return [
            ...extensions,
            editable.of(EditorView.editable.of(!readOnly)),
            json(),
        ];
    }
    if (suffix === '.mzc') {
        return [...extensions, editable.of(EditorView.editable.of(false))];
    }
    if (suffix === '.dzn') {
        return [
            ...extensions,
            editable.of(EditorView.editable.of(!readOnly)),
            MiniZinc(),
        ];
    }
    if (suffix === '.html') {
        return [
            ...extensions,
            editable.of(EditorView.editable.of(!readOnly)),
            html(),
        ];
    }
    return [
        ...extensions,
        editable.of(EditorView.editable.of(!readOnly)),
        MiniZinc(),
        EditorView.updateListener.of(debounce(codeCheck, 250)),
    ];
}
