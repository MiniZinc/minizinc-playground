# Embedding the MiniZinc Playground

The playground can be embedded in an iframe. The Embed tab of the Share modal,
opened with the playground's share button, generates an iframe snippet for the
active project.

There are two ways to use an embed:

- Use an iframe by itself when the project only needs to be displayed and
  edited.
- Use the JavaScript client when the host page needs to load projects, run
  models, receive output, or save changes.

## Basic iframe

An embed URL has a URL-encoded JSON configuration object in the `#embed=`
fragment:

```html
<iframe
    src="https://play.minizinc.dev/#embed=%7B%22theme%22%3A%22dark%22%7D"
    title="MiniZinc Playground"
    width="100%"
    height="700"
    allow="clipboard-write"
></iframe>
```

The `allow="clipboard-write"` attribute enables the playground's clipboard
controls where the browser supports them. Choose an appropriate title and
height for the host page.

In embedded mode, the playground does not use local or session storage. If the
host needs persistence, use the JavaScript client's `project-changed` event and
store the project in the host application.

## JavaScript client

The client is also available as a browser script at
`https://play.minizinc.dev/embed.js`. It exposes the `MiniZincPlayground`
global:

```html
<script src="https://play.minizinc.dev/embed.js"></script>
<script>
    const iframe = document.querySelector('#playground');
    const embed = MiniZincPlayground(iframe);
</script>
```

For a self-hosted build, serve `dist/embed.js` alongside the application and
replace the script URL with the corresponding `/embed.js` URL.

For module-based hosts, use the ES module build instead:

```html
<script type="module">
    import minizincPlayground from 'https://play.minizinc.dev/embed.module.js';

    const embed = minizincPlayground(document.querySelector('#playground'));
</script>
```

The factory must be given an iframe element whose `src` points at the
playground. It installs its event listener immediately, so it is safe to call
it before the iframe has finished loading.

### Readiness and versions

`embed.ready` is a promise. It resolves once the initial project has loaded and
the playground is ready to accept commands:

```js
try {
    const info = await embed.ready;
    console.log(info.minizincVersion);
} catch (error) {
    console.error('The playground did not become ready', error);
}
```

The readiness object contains:

| Property          | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `minizincVersion` | MiniZinc version selected by the embedded playground. |

Commands called before readiness are queued automatically. This means a host
can create the client and immediately call `loadProject()` without adding a
separate iframe `load` handler.

### Commands

Every command returns a promise. The promise resolves after the playground has
completed the operation and rejects if the operation fails or times out.

| Method                 | Argument                             | Resolves to                             |
| ---------------------- | ------------------------------------ | --------------------------------------- |
| `loadProject(project)` | A project object                     | The loaded project.                     |
| `getProject()`         | None                                 | The current project.                    |
| `run()`                | None                                 | Completion of the run request.          |
| `stop()`               | None                                 | Completion of the stop request.         |
| `compile()`            | None                                 | Completion of the compile request.      |
| `clearOutput()`        | None                                 | Completion of the clear-output request. |
| `setOptions(options)`  | A partial embed configuration object | The current embed options.              |

For example, a host can load a model, run it, and persist the resulting
project:

```js
const project = {
    files: [{ name: 'model.mzn', contents: 'solve satisfy;' }],
    tab: 0,
};

await embed.loadProject(project);
await embed.setOptions({ theme: 'dark', showTabs: false });
await embed.run();

const currentProject = await embed.getProject();
saveProject(currentProject);
```

`setOptions()` changes runtime options only. It cannot change the project's
initial `url` or inline `project`; load a new project with `loadProject()`.

### Events

Use `on(event, listener)` to subscribe after construction. It returns a
function that removes that listener:

```js
const stopListening = embed.on('minizinc', (message) => {
    renderOutput(message);
});
embed.on('project-changed', (project) => saveProject(project));
embed.on('run-error', (info) => showError(info));

// Later:
stopListening();
```

The supported events and callback arguments are:

| Event             | Listener argument                                        |
| ----------------- | -------------------------------------------------------- |
| `ready`           | The readiness information. Usually prefer `embed.ready`. |
| `project-changed` | The current project object.                              |
| `solvers-changed` | The current array of solver objects.                     |
| `run-started`     | `{ files, isCompile? }`.                                 |
| `minizinc`        | A MiniZinc output or event object.                       |
| `run-finished`    | `{ files, isCompile? }`.                                 |
| `run-error`       | `{ files, isCompile?, error: { message } }`.             |

The `isCompile` property is present for compilation events. A host can use the
run lifecycle events to show progress without parsing MiniZinc output:

```js
embed.on('run-started', ({ isCompile }) => {
    status.textContent = isCompile ? 'Compiling…' : 'Running…';
});

embed.on('run-finished', () => {
    status.textContent = 'Finished';
});

embed.on('run-error', ({ error }) => {
    status.textContent = `Failed: ${error.message}`;
});
```

### Errors and teardown

Command promises reject with an `Error` when the playground reports a failure,
when a request exceeds the client's built-in timeout, or after the client is
destroyed. Readiness also rejects if the iframe does not become ready in time.

Call `destroy()` when removing the iframe or leaving the host page:

```js
embed.destroy();
iframe.remove();
```

`destroy()` is safe to call more than once. It removes event listeners and
rejects outstanding commands. If the iframe is replaced or reloaded in a way
that creates a new browsing context, create a new client for the new iframe.

### Security and origins

The client accepts messages only from the iframe's `contentWindow` and the
origin derived from `iframe.src`. The iframe URL should point directly to the
trusted playground deployment and should not redirect to another origin.

## Embed configuration

The embed configuration can contain either `project` (in the same format as
share URLs) or `url` (which loads a project from a URL), but not both. All
configuration properties are optional. Unknown properties are ignored in an
embed URL.

| Property                       | Type                          | Default      | Description                                                   |
| ------------------------------ | ----------------------------- | ------------ | ------------------------------------------------------------- |
| `theme`                        | `"auto" \| "light" \| "dark"` | `"auto"`     | Colour theme.                                                 |
| `showVersionSwitcher`          | boolean                       | `false`      | Show the MiniZinc version switcher.                           |
| `showSolverDropdown`           | boolean                       | `true`       | Show the solver selector.                                     |
| `showShareButton`              | boolean                       | `false`      | Show the share button.                                        |
| `showDownloadButton`           | boolean                       | `false`      | Show the project download button.                             |
| `showExternalPlaygroundButton` | boolean                       | `true`       | Show a button to open the project in a standalone playground. |
| `showTabs`                     | boolean                       | `true`       | Show the file tabs.                                           |
| `canEditTabs`                  | boolean                       | `true`       | Allow files and tabs to be edited.                            |
| `compilationEnabled`           | boolean                       | `false`      | Enable compilation.                                           |
| `canEditSolverSettings`        | boolean                       | `true`       | Allow solver settings to be edited.                           |
| `enabledSolvers`               | array of strings \| `null`    | `null`       | Restrict the solver list by solver ID.                        |
| `canSwitchOrientation`         | boolean                       | `false`      | Allow switching the editor/output orientation.                |
| `hideOutputOnStartup`          | boolean                       | `true`       | Hide output when the iframe starts.                           |
| `autoFocus`                    | boolean                       | `true`       | Focus the editor automatically.                               |
| `splitterDirection`            | `"vertical" \| "horizontal"`  | `"vertical"` | Initial editor/output layout.                                 |
| `splitterSize`                 | number                        | `75`         | Initial splitter size.                                        |
| `autoClearOutput`              | boolean                       | `false`      | Clear output before each run.                                 |
| `showClearOutput`              | boolean                       | `true`       | Show the clear-output control.                                |
| `showAutoClearOutput`          | boolean                       | `false`      | Show the auto-clear-output control.                           |
| `showOutputSectionToggles`     | boolean                       | `false`      | Show output section toggles.                                  |
| `showOutputRightControls`      | boolean                       | `false`      | Show controls on the right side of output.                    |

Example configuration with an inline project:

```json
{
    "theme": "dark",
    "showTabs": false,
    "project": {
        "files": [{ "name": "model.mzn", "contents": "solve satisfy;" }],
        "tab": 0
    }
}
```

To load this configuration, encode it in the URL fragment:

```js
const config = {
    theme: 'dark',
    project: {
        files: [{ name: 'model.mzn', contents: 'solve satisfy;' }],
        tab: 0,
    },
};
const url = new URL('https://play.minizinc.dev/');
url.hash = `#embed=${encodeURIComponent(JSON.stringify(config))}`;
```
