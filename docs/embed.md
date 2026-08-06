# Embedding the MiniZinc Playground

The playground can be embedded in an iframe. The Embed tab of the Share modal, opened with the
playground's share button, generates an iframe snippet for the active project.

## Embed URL

An embed URL has a URL-encoded JSON configuration object in the `#embed=` fragment:

For example:

```html
<iframe
    src="https://play.minizinc.dev/#embed=%7B%22theme%22%3A%22dark%22%7D"
    title="MiniZinc Playground"
    width="100%"
    height="700"
    allow="clipboard-write"
></iframe>
```

The embed configuration can contain either `project` (in the same format as for share URLs) or `url` (which loads from a URL).

In embedded mode, no local/session storage is used, so any persistence must be implemented by the embedder.

## Configuration schema

All options are optional. The defaults below apply when an option is omitted.
Unknown properties are ignored in an embed URL.

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `theme` | `"auto" \| "light" \| "dark"` | `"auto"` | Colour theme. |
| `showVersionSwitcher` | boolean | `true` | Show the MiniZinc version switcher. |
| `showSolverDropdown` | boolean | `true` | Show the solver selector. |
| `showShareButton` | boolean | `true` | Show the share button. |
| `showDownloadButton` | boolean | `true` | Show the project download button. |
| `showExternalPlaygroundButton` | boolean | `false` | Show a button to open the project in a standalone playground. |
| `showTabs` | boolean | `true` | Show the file tabs. |
| `canEditTabs` | boolean | `true` | Allow files and tabs to be edited. |
| `compilationEnabled` | boolean | `true` | Enable compilation. |
| `canEditSolverSettings` | boolean | `true` | Allow solver settings to be edited. |
| `enabledSolvers` | array of strings \| `null` | `null` | Restrict the solver list by solver ID. |
| `canSwitchOrientation` | boolean | `true` | Allow switching the editor/output orientation. |
| `hideOutputOnStartup` | boolean | `true` | Hide output when the iframe starts. |
| `autoFocus` | boolean | `true` | Focus the editor automatically. |
| `splitterDirection` | `"vertical" \| "horizontal"` | `"vertical"` | Initial editor/output layout. |
| `splitterSize` | number | `75` | Initial splitter size. |
| `autoClearOutput` | boolean | `false` | Clear output before each run. |
| `showClearOutput` | boolean | `true` | Show the clear-output control. |
| `showAutoClearOutput` | boolean | `true` | Show the auto-clear-output control. |
| `showOutputSectionToggles` | boolean | `true` | Show output section toggles. |
| `showOutputRightControls` | boolean | `true` | Show controls on the right side of output. |

Example configuration with an inline project:

```json
{
  "theme": "dark",
  "showTabs": false,
  "project": {
    "files": [
      { "name": "model.mzn", "contents": "solve satisfy;" }
    ],
    "tab": 0
  }
}
```

## Messaging API

The iframe and its parent communicate with `window.postMessage`. Every message is an object with this format:

```json
{
  "channel": "minizinc-playground",
  "version": 1,
  "type": "message-type",
  "requestId": "optional-correlation-id",
  "payload": { ... }
}
```

### Playground to parent messages

Once the playground has loaded, it sends:

```json
{
  "channel": "minizinc-playground",
  "version": 1,
  "type": "ready",
  "payload": {
    "protocolVersion": 1,
    "applicationVersion": "…",
    "minizincVersion": "…"
  }
}
```

The playground also emits these events. Their payloads are:

| Event | Payload |
| --- | --- |
| `project-changed` | `{ "project": <project> }` |
| `solvers-changed` | `{ "solvers": <solver array> }` |
| `run-started` | `{ "files": <string array>, "isCompile": <boolean?> }` |
| `minizinc` | A MiniZinc event/message object passed through from MiniZinc. |
| `run-finished` | `{ "files": <string array>, "isCompile": <boolean?> }` |
| `run-error` | `{ "files": <string array>, "isCompile": <boolean?>, "error": { "message": <string> } }` |

### Parent to playground commands

The parent can send these commands to the iframe after the `ready` message has been received (messages sent beforehand are ignored):

| Command | Payload | Successful response |
| --- | --- | --- |
| `load-project` | `{ "project": <project> }` | `{ "project": <project> }` |
| `get-project` | `{}` | `{ "project": <project> }` |
| `run` | `{}` | `{}` |
| `stop` | `{}` | `{}` |
| `compile` | `{}` | `{}` |
| `clear-output` | `{}` | `{}` |
| `set-options` | A partial configuration object | `{ "options": <current options> }` |

Responses use `type: "response"` and copy the command's `requestId`:

```json
{
  "channel": "minizinc-playground",
  "version": 1,
  "type": "response",
  "requestId": "request-1",
  "payload": { "project": {} }
}
```

If a command is unknown, has an invalid payload, or fails, the iframe sends an
`error` with the same request ID and a message payload:

```json
{
  "channel": "minizinc-playground",
  "version": 1,
  "type": "error",
  "requestId": "request-1",
  "payload": { "message": "error details" }
}
```
