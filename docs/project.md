# Native project object

This document describes the playground's internal project object. It is the
object returned by `Playground.getProject()` and passed through share URLs,
local sessions, and the embed API. It is a JavaScript object serialized as JSON
when it crosses one of those boundaries.

This is not the format of a downloaded MiniZinc `.mzp` project. `.mzp` is the
project format used by the native MiniZincIDE application; the two formats are
not the same, and the playground converts `.mzp` projects when loading them.

## Canonical shape

The playground emits an object with this shape:

```js
{
    files: [
        {
            name: 'model.mzn',
            contents: 'solve satisfy;\n',
            // Optional file flags are omitted when false.
            hidden: true,
            readOnly: true,
            readOnlyLines: [[1, 1]],
        },
    ],
    tab: 0,
    solverId: 'org.minizinc.gecode_presolver',
    solverConfig: {
        enableTimeLimit: false,
        timeLimit: 1,
        allSolutions: false,
        verboseCompilation: false,
        verboseSolving: false,
        compilerStatistics: false,
        solvingStatistics: false,
        outputTime: false,
        freeSearch: false,
    },
    minizincVersion: 'latest',
}
```

`files` is the only field needed to describe source files. The other fields
preserve the current UI and execution state. Empty or partial project objects
are accepted by the embed configuration normaliser; missing values use the
defaults described below.

## Top-level fields

| Field             | Type                  | Meaning                                                                                                 |
| ----------------- | --------------------- | ------------------------------------------------------------------------------------------------------- |
| `files`           | array of file objects | All files in project order, including hidden files. `getProject()` always emits this field.             |
| `tab`             | non-negative integer  | Index into `files` for the current tab. It is an array index, not a file name.                          |
| `solverId`        | string                | The solver's MiniZinc solver identifier. The value is matched against the currently loaded solver list. |
| `solverConfig`    | object                | Values from the solver-settings panel. See [solver configuration](#solver-configuration).               |
| `minizincVersion` | `'latest' \| 'edge'`  | Selects the stable/latest or development/edge MiniZinc WebAssembly build.                               |

When loading a project, `solverId`, `solverConfig`, and `minizincVersion` may be
omitted. An omitted solver ID selects the configured default solver; an omitted
solver configuration resets all settings to their defaults; and any version
other than exactly `'edge'` selects the latest build. The embed normaliser
defaults a missing `files` array to `[]` and `tab` to `0`.

The standalone application also adds a `timestamp` to projects stored in
recent sessions. `timestamp` is session metadata, not part of the native
project format and is not emitted by `getProject()`.

## File objects

Each entry in `files` has the following fields:

| Field           | Type                           | Meaning                                                                                                                                    |
| --------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`          | string                         | Display name and file type suffix. Names are made unique and sanitised when opened in the editor.                                          |
| `contents`      | string                         | Complete text of the file.                                                                                                                 |
| `hidden`        | boolean                        | If true, retain the file in the project but do not show it as a tab. Files ending in `.mzc` are hidden automatically. Omitted means false. |
| `readOnly`      | boolean                        | If true, prevent editing the file. Omitted means false.                                                                                    |
| `readOnlyLines` | array of `[first, last]` pairs | Inclusive, 1-based line ranges that cannot be edited. Omitted means no protected lines.                                                    |

Only `name` and `contents` are emitted for an ordinary editable visible file.
The optional flags are emitted only when active. A hidden file is still passed
to MiniZinc and remains in the project; `hidden` controls the editor UI rather
than file availability.

`readOnlyLines` is applied in addition to `readOnly`. Its line numbers refer to
the original contents when the project is loaded. The line-range implementation
expects valid ranges; callers should provide existing, 1-based line numbers
with `first <= last`.

### Load-time-only file fields

The loader also understands `anchor` on a file object. It is an initial cursor
position in the file, measured as a CodeMirror document offset. It is useful for
constructing a project before opening it, but `getProject()` does not preserve
it. Likewise, the editor's CodeMirror state and scroll positions are internal
runtime data and are never part of the serialized project object.

Files are kept in array order. The loader may rename duplicate or path-like
names for display, so consumers should not rely on the input name being
unchanged after loading.

## Solver configuration

`solverConfig` stores UI values rather than the final MiniZinc command-line
options. Its keys and defaults are:

| Field                | Type    | Default | Meaning                                                   |
| -------------------- | ------- | ------: | --------------------------------------------------------- |
| `enableTimeLimit`    | boolean | `false` | Enable the time limit.                                    |
| `timeLimit`          | number  |     `1` | Time limit in seconds when enabled.                       |
| `allSolutions`       | boolean | `false` | Request all solutions when supported by the solver flags. |
| `verboseCompilation` | boolean | `false` | Enable verbose compiler output.                           |
| `verboseSolving`     | boolean | `false` | Enable verbose solver output when supported.              |
| `compilerStatistics` | boolean | `false` | Include compiler statistics.                              |
| `solvingStatistics`  | boolean | `false` | Include solver statistics when supported.                 |
| `outputTime`         | boolean | `false` | Include solution timing information.                      |
| `freeSearch`         | boolean | `false` | Enable free search when supported by the solver flags.    |

Unknown solver-configuration keys are discarded when settings are loaded.
Unsupported options are also omitted when the final solver configuration is
constructed, based on the selected solver's supported standard flags.

Older shared projects may contain numeric `solver` values. The standalone
application migrates `0` to `org.minizinc.gecode_presolver` and `1` to
`org.minizinc.mip.coin-bc` before loading. New code should use `solverId`.

## Example

```js
const project = {
    files: [
        {
            name: 'model.mzn',
            contents: 'include "data.dzn";\nsolve satisfy;\n',
        },
        {
            name: 'data.dzn',
            contents: 'n = 10;\n',
            hidden: true,
        },
    ],
    tab: 0,
    solverId: 'org.minizinc.gecode_presolver',
    solverConfig: { timeLimit: 5, enableTimeLimit: true },
    minizincVersion: 'latest',
};
```

When this partial `solverConfig` is loaded, unspecified settings are filled
from the defaults. A project obtained from `getProject()` will contain every
solver-configuration key.
