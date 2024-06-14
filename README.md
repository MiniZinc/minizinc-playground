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
