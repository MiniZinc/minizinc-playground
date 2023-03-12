import { parser } from './minizinc.grammar';
import { basicSetup } from 'codemirror';
import { EditorView, keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
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
                'Call/Identifier Call/QuotedIdentifier GeneratorCall/Identifier GeneratorCall/QuotedIdentifier': t.name,
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

const theme = createTheme({
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

const extensions = [
    basicSetup,
    keymap.of([indentWithTab]),
    theme,
    EditorView.theme({
        '&': { height: '100%' },
        '&.cm-editor.cm-focused': { outline: 'none' },
        '.cm-content, .cm-gutter': { minHeight: '100%' },
    }),
];
export const DataZincEditorExtensions = [...extensions, MiniZinc()];
export const MiniZincEditorExtensions = (f) => [
    ...DataZincEditorExtensions,
    EditorView.updateListener.of(debounce(f, 250)),
];
export const JSONEditorExtensions = [...extensions, json()];

export const ReadonlyTextExtensions = [
    ...extensions,
    EditorView.editable.of(false),
];
