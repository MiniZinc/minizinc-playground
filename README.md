MiniZinc Playground
===================

Write and run MiniZinc models entirely within your browser.

Try it out at https://play.minizinc.dev.

The playground is a [Svelte](https://svelte.dev) app which uses the
[WebAssembly build of MiniZinc](https://github.com/minizinc/minizinc-js) to run MiniZinc locally in the browser.
The GUI is styled using [Bulma](https://bulma.io) and [CodeMirror](https://codemirror.net) is used for the code editor.

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
