# MiniZinc Playground

Write and run MiniZinc models entirely within your browser.

Try it out at https://play.minizinc.dev.

The playground is a [Svelte](https://svelte.dev) app which uses the
[WebAssembly build of MiniZinc](https://github.com/minizinc/minizinc-js) to run MiniZinc locally in the browser.
The GUI is styled using [Bulma](https://bulma.io) and [CodeMirror](https://codemirror.net) is used for the code editor.

## Sharing projects

The playground supports generating a link which opens the active project (including the current tab and solver settings) using the share button on the top-right. It may be useful to pass these through a link shortening service to get more friendly URLs.

### Loading code directly

You can also generate URLs which directly populate the playground with some code by using `#code=<minizinc code>` as the URL hash.

For example: [`https://play.minizinc.dev/#code=var%201..3%3A%20x%3B`](https://play.minizinc.dev/#code=var%201..3%3A%20x%3B)

### Loading from a remote source

It's also possible to generate a link to load a project from a remote URL by using `#url=<file url>` as the hash.

For example: [`https://play.minizinc.dev/#url=https%3A%2F%2Fraw.githubusercontent.com%2FMiniZinc%2Flibminizinc%2Fmaster%2Fdocs%2Fen%2Fexamples%2Floan%2Floan.mzp`](https://play.minizinc.dev/#url=https%3A%2F%2Fraw.githubusercontent.com%2FMiniZinc%2Flibminizinc%2Fmaster%2Fdocs%2Fen%2Fexamples%2Floan%2Floan.mzp)

## Embedding

The normal playground can be embedded directly in an iframe. Use a URL-encoded
JSON configuration in the `#embed=` fragment and give the iframe a fixed height:

```html
<iframe
    src="https://play.minizinc.dev/#embed=%7B%22theme%22%3A%22dark%22%7D"
    title="MiniZinc Playground"
    width="100%"
    height="700"
    allow="clipboard-write"
></iframe>
```

The configuration may set `theme`, `showVersionSwitcher`,
`showSolverDropdown`, `showShareButton`, `showDownloadButton`,
`showExternalPlaygroundButton`, `showTabs`, `canEditTabs`,
`compilationEnabled`, `canEditSolverSettings`, `enabledSolvers`,
`canSwitchOrientation`, `hideOutputOnStartup`, `autoFocus`,
`splitterDirection`, `splitterSize`, `autoClearOutput`, `showClearOutput`,
`showAutoClearOutput`, `showOutputSectionToggles`, and
`showOutputRightControls`. The external-playground button opens a shared
project URL using the current page's origin. The configuration may also contain either
`project` (the existing `getProject()` format) or `url` (a supported remote
MiniZinc file or project), but not both. Embedded instances do not use browser
storage.

After loading, the iframe sends a `ready` `postMessage` envelope on the
`minizinc-playground` channel. Hosts can then send version 1 `load-project`,
`get-project`, `run`, `stop`, `compile`, `clear-output`, and `set-options`
commands. Commands use `{ channel, version, type, requestId, payload }`;
`load-project` receives `{ project }`. `set-options` receives a partial
configuration object: supplied supported options replace their current values,
and omitted options remain unchanged. The iframe returns `response` or `error` with the same
`requestId`, and emits `project-changed`, `run-started`, `output`,
`run-finished`, `run-error`, and `solvers-changed` events. The target origin is
currently `*`, so hosts should validate received messages.

## Development

```sh
npm ci
npm run dev
```

## Building

```sh
npm run build
```

The playground application will be located in `./dist`.

If the application needs to be served from a subdirectory, set the environment variable `BASE_PATH` to the path when
building.
