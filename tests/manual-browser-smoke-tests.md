# Manual browser smoke tests

Run these checks against a local or deployed build before releasing iframe
embedding. Record the browser, operating system, build URL, and result.

1. Open a plain iframe with no host JavaScript.
2. Load inline and remote projects through `#embed`, including every supported
   remote file type.
3. Confirm embedded mode does not access or update browser storage.
4. Send commands after `ready`; inspect responses and `minizinc` events. Confirm
   commands sent before `ready` are discarded.
5. Run and compile a tiny deterministic model.
6. Run a model separated from its data. With a data file marked `useAsData`, no
   modal should appear on any run; unmarked, the modal should appear on the first
   run only, and its answer should hold for later runs and be reported by
   `getProject()`.
7. Check CodeMirror editing, focus, downloads, clipboard behavior, and a model
   with a nested visualisation.
8. Reload and remove the iframe to check teardown behavior.
