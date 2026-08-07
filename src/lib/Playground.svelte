<script>
    import Editor from './Editor.svelte';
    import SplitPanel from './SplitPanel.svelte';
    import Tabs from './Tabs.svelte';
    import Fa from 'svelte-fa';
    import {
        faPlay,
        faStop,
        faCog,
        faShareNodes,
        faDownload,
        faArrowUpRightFromSquare,
        faRotate,
        faHammer,
        faShuffle,
    } from '@fortawesome/free-solid-svg-icons';
    import Modal from './Modal.svelte';
    import { EditorState } from '@codemirror/state';
    import {
        editableEffect,
        readOnlyEffect,
        lightThemeEffect,
        darkThemeEffect,
        getExtensions,
    } from '../lang';
    import Output from './Output.svelte';
    import Visualisation from './Visualisation.svelte';
    import NewFileModal from './NewFileModal.svelte';
    import ManageFilesModal from './ManageFilesModal.svelte';
    import ShareModal from './ShareModal.svelte';
    import ModelModal from './ModelModal.svelte';
    import ParameterModal from './ParameterModal.svelte';
    import SolverConfig from './SolverConfig.svelte';
    import Dropdown from './Dropdown.svelte';
    import { addErrors, lineCharToPos } from '../lang/underline';
    import { onMount, tick, untrack } from 'svelte';

    import * as MiniZincLatest from 'https://cdn.jsdelivr.net/npm/minizinc/dist/minizinc.mjs';
    import * as MiniZincEdge from 'https://cdn.jsdelivr.net/npm/minizinc@edge/dist/minizinc.mjs';
    import { browserDarkMode, screenMobile } from './mediaQueries';

    /**
     * @typedef {Object} Props
     * @property {boolean} [showVersionSwitcher]
     * @property {boolean} [showSolverDropdown]
     * @property {boolean} [edgeMiniZinc]
     * @property {boolean} [autoClearOutput]
     * @property {boolean} [showTabs]
     * @property {boolean} [canEditTabs]
     * @property {boolean} [compilationEnabled]
     * @property {any} project
     * @property {any[] | null} [enabledSolvers]
     * @property {boolean} [canEditSolverSettings]
     * @property {boolean} [showShareButton]
     * @property {boolean} [showDownloadButton]
     * @property {boolean} [showExternalPlaygroundButton]
     * @property {string} [splitterDirection]
     * @property {number} [splitterSize]
     * @property {boolean} [canSwitchOrientation]
     * @property {boolean} [showClearOutput]
     * @property {boolean} [showAutoClearOutput]
     * @property {boolean} [showOutputSectionToggles]
     * @property {boolean} [showOutputRightControls]
     * @property {string} [theme]
     * @property {boolean} [hideOutputOnStartup]
     * @property {boolean} [autoFocus]
     * @property {import('svelte').Snippet<[{ isMobile: boolean }]>} [navbarBeforeRunButtons]
     * @property {import('svelte').Snippet<[{ isMobile: boolean }]>} [navbarRunButtons]
     * @property {import('svelte').Snippet<[{ isMobile: boolean }]>} [navbarAfterRunButtons]
     * @property {import('svelte').Snippet<[{ isMobile: boolean }]>} [navbarAfterSolverSelector]
     * @property {import('svelte').Snippet<[{ isMobile: boolean }]>} [navbarBeforeShareButtons]
     * @property {import('svelte').Snippet<[{ isMobile: boolean }]>} [navbarShareButtons]
     * @property {import('svelte').Snippet<[{ isMobile: boolean }]>} [navbarAfterShareButtons]
     * @property {import('svelte').Snippet<[]>} [children]
     * @property {(payload: { project: any }) => void} [onprojectChanged]
     * @property {(payload: { files: string[], isCompile?: boolean }) => void} [onrunStarted]
     * @property {(value: any) => void} [onoutput]
     * @property {(payload: { files: string[], isCompile?: boolean }) => void} [onrunFinished]
     * @property {(payload: { files: string[], error: { message: string }, isCompile?: boolean }) => void} [onrunError]
     * @property {(payload: { solvers: any[] }) => void} [onsolversChanged]
     */

    /** @type {Props} */
    let {
        showVersionSwitcher = true,
        showSolverDropdown = true,
        edgeMiniZinc = $bindable(false),
        autoClearOutput = $bindable(false),
        showTabs = true,
        canEditTabs = true,
        compilationEnabled = true,
        project,
        enabledSolvers = null,
        canEditSolverSettings = true,
        showShareButton = true,
        showDownloadButton = true,
        showExternalPlaygroundButton = false,
        splitterDirection = $bindable('vertical'),
        splitterSize = $bindable(75),
        canSwitchOrientation = true,
        showClearOutput = true,
        showAutoClearOutput = true,
        showOutputSectionToggles = true,
        showOutputRightControls = true,
        theme = 'auto',
        hideOutputOnStartup = true,
        autoFocus = true,
        navbarBeforeRunButtons,
        navbarRunButtons,
        navbarAfterRunButtons,
        navbarAfterSolverSelector,
        navbarBeforeShareButtons,
        navbarShareButtons,
        navbarAfterShareButtons,
        children,
        onprojectChanged,
        onrunStarted,
        onoutput,
        onrunFinished,
        onrunError,
        onsolversChanged,
    } = $props();

    let busyCount = $state(0);
    let allSolvers = $state([]);
    let solversLoaded;
    /**
     * @type typeof MiniZincLatest
     */
    let MiniZinc;

    let minizincVersions = $state({
        latest: { label: 'Latest', detail: 'stable' },
        edge: { label: 'Edge', detail: 'development' },
    });

    function loadSolvers(useEdge = edgeMiniZinc) {
        const toLoad = useEdge ? MiniZincEdge : MiniZincLatest;
        if (MiniZinc !== toLoad) {
            busyCount++;
            const pendingLoad = solversLoaded;
            solversLoaded = new Promise(async (resolve, _reject) => {
                if (pendingLoad) {
                    await pendingLoad;
                }
                if (MiniZinc) {
                    MiniZinc.shutdown();
                }
                MiniZinc = toLoad;
                MiniZinc.shutdown();
                await MiniZinc.init();
                const [mznVersion] =
                    /version \d+\.\d+\.\d+(?:, build .*)?$/m.exec(
                        await MiniZinc.version(),
                    );
                const key = useEdge ? 'edge' : 'latest';
                minizincVersions = {
                    ...minizincVersions,
                    [key]: { ...minizincVersions[key], detail: mznVersion },
                };
                allSolvers = await MiniZinc.solvers();
                await tick();
                busyCount--;
                resolve();
            });
        }
        return solversLoaded;
    }

    const mounted = new Promise((resolve, _reject) => {
        onMount(() => {
            loadSolvers();
            resolve();
        });
    });

    /** @param {Record<string, any> | null | undefined} project */
    export async function loadProject(project) {
        if (!project) {
            return;
        }
        isLoadingProject = true;
        try {
            edgeMiniZinc = project.minizincVersion === 'edge';
            await mounted;
            files = [];
            openFiles(project.files, autoFocus, false);
            currentIndex = project.tab || 0;
            await loadSolvers();
            if (project.solverId) {
                currentSolverIndex = solvers.findIndex(
                    (s) => s.id === project.solverId,
                );
            } else {
                currentSolverIndex =
                    solvers.findIndex(
                        (s) => s.extraInfo && s.extraInfo.isDefault,
                    ) || 0;
            }
            if (project.solverConfig) {
                solverConfig.load(project.solverConfig);
            } else {
                solverConfig.reset();
            }
            notifyProjectChanged();
        } finally {
            await tick();
            if (editor && currentFile) {
                editor.setState(currentFile.state);
            }
            await tick();
            isLoadingProject = false;
        }
    }

    let projectLoad = Promise.resolve();
    export function whenProjectLoaded() {
        return projectLoad;
    }

    export function getMiniZincVersion() {
        const key = edgeMiniZinc ? 'edge' : 'latest';
        return minizincVersions[key].detail;
    }

    function notifyProjectChanged() {
        if (currentSolver && solverConfig) {
            onprojectChanged?.({ project: getProject() });
        }
    }

    /** @param {import('@codemirror/state').EditorState} state */
    function editorChanged(state) {
        if (!currentFile) {
            return;
        }
        files[currentIndex] = { ...currentFile, state };
        files = files;
        notifyProjectChanged();
    }

    /** @param {{ files: Array<Record<string, any>>, tab?: number, solverId?: string }} e */
    async function importFiles(e) {
        const offset = files.length;
        openFiles(e.files);
        if (e.tab !== undefined && e.tab !== null && e.tab >= 0) {
            selectTab(offset + e.tab);
        }
        if (e.solverId) {
            await loadSolvers();
            currentSolverIndex = solvers.findIndex((s) => s.id === e.solverId);
        }
        notifyProjectChanged();
    }

    export function hasFiles() {
        return files.length > 0;
    }

    let editor = $state();
    let files = $state([]);
    let isLoadingProject = $state(false);

    let menuActive = $state(false);

    let currentIndex = $state(0);
    let solverConfig = $state();

    let newFileRequested = $state(false);
    let deleteFileRequested = $state(null);
    let managingFiles = $state(false);

    let needsModel = $state(false);
    let needsData = $state(null);

    let hasRun = $state(false);

    let output = $state([]);
    let minizinc = $state(null);

    let parameterModalDataFiles = [];
    let parameterModalParameters = $state({});

    let currentSolverIndex = $state(-1);

    /** @param {any[]} _solvers @param {number} _currentSolverIndex */
    function enforceValidSolver(_solvers, _currentSolverIndex) {
        if (_currentSolverIndex < 0 || _currentSolverIndex >= _solvers.length) {
            const idx = _solvers.findIndex(
                (s) => s.extraInfo && s.extraInfo.isDefault,
            );
            if (idx !== -1) {
                currentSolverIndex = idx;
            }
        }
    }

    let showSolverConfig = $state(false);
    function toggleSolverConfig() {
        showSolverConfig = !showSolverConfig;
    }

    /** @param {number} index @param {boolean} [focus] @param {boolean} [saveCurrentFile] */
    async function selectTab(index, focus = true, saveCurrentFile = true) {
        if (editor && saveCurrentFile) {
            if (currentIndex < files.length) {
                currentFile.state = editor.getState();
                currentFile.scrollTop = editor.getView().scrollDOM.scrollTop;
                currentFile.scrollLeft = editor.getView().scrollDOM.scrollLeft;
            }
        }
        while (index >= 0 && files[index].hidden) {
            index--;
        }
        if (index === -1) {
            index = files.findIndex((f) => !f.hidden);
        }
        currentIndex = index;
        await tick();
        if (editor && currentFile) {
            if (focus) {
                editor.focus();
            }
            if (currentFile.scrollTop !== undefined) {
                editor.getView().requestMeasure({
                    read(view) {
                        view.scrollDOM.scrollTo(
                            currentFile.scrollLeft,
                            currentFile.scrollTop,
                        );
                    },
                });
            }
        }
    }

    /** @param {string} suffix */
    async function newFile(suffix) {
        let name = `Untitled${suffix}`;
        let i = 2;
        while (files.find((f) => f.name === name)) {
            name = `Untitled-${i++}${suffix}`;
        }
        files = [
            ...files,
            {
                name,
                state: EditorState.create({
                    extensions: getExtensions(suffix, checkCode, darkMode),
                }),
            },
        ];
        // The active index changes before the editor component has switched its
        // CodeMirror view. Wait for that switch before serialising the project,
        // otherwise getProject() captures the previous file's contents here.
        await selectTab(files.length - 1);
        newFileRequested = false;
        notifyProjectChanged();
    }

    /** @param {Array<Record<string, any>>} toOpen @param {boolean} [focus] @param {boolean} [saveCurrentFile] */
    function openFiles(toOpen, focus = true, saveCurrentFile = true) {
        let toAdd = [];
        for (const file of toOpen) {
            const dot = file.name.endsWith('.mzc.mzn')
                ? file.name.length - 8
                : file.name.lastIndexOf('.');
            const stem = file.name
                .substring(0, dot)
                .replaceAll(/[\/\\\.]/g, '');
            const suffix = file.name.substring(dot);
            let name = `${stem}${suffix}`;
            let i = 2;
            while (files.find((f) => f.name === name)) {
                name = `${stem}-${i++}${suffix}`;
            }
            const extensions = getExtensions(
                suffix,
                checkCode,
                darkMode,
                file.readOnly,
                file.readOnlyLines,
            );
            toAdd.push({
                ...file,
                hidden: file.hidden || suffix === '.mzc',
                name,
                state: EditorState.create({
                    doc: file.contents,
                    extensions,
                    selection: { anchor: file.anchor || 0 },
                }),
            });
        }
        files = [...files, ...toAdd];
        selectTab(files.length - 1, focus, saveCurrentFile);
        newFileRequested = false;
        notifyProjectChanged();
    }

    function rename(e) {
        const { index, name, suffix } = e;
        let dest = name;
        let i = 2;
        while (
            files.some(
                (f, fileIndex) =>
                    fileIndex !== index && f.name === dest + suffix,
            )
        ) {
            dest = `${name}-${i++}`;
        }
        if (currentFile && !isLoadingProject) {
            currentFile.state = editor.getState();
        }
        files = [
            ...files.slice(0, index),
            { ...files[index], name: dest + suffix },
            ...files.slice(index + 1),
        ];
        notifyProjectChanged();
    }

    /** @param {number} index */
    function closeFile(index) {
        const createNew = visibleFileCount === 1 && !files[index].hidden;
        files = [
            ...files.slice(0, index),
            ...files.slice(index + 1),
            ...(createNew
                ? [
                      {
                          name: 'Untitled.mzn',
                          state: EditorState.create({
                              extensions: getExtensions(
                                  '.mzn',
                                  checkCode,
                                  darkMode,
                              ),
                          }),
                      },
                  ]
                : []),
        ];
        if (currentIndex >= files.length) {
            selectTab(files.length - 1);
        } else {
            selectTab(currentIndex);
        }
        deleteFileRequested = null;
        notifyProjectChanged();
    }

    /** @param {number} index @param {Record<string, any>} opts */
    function modifyFile(index, opts) {
        if (currentFile && !isLoadingProject) {
            currentFile.state = editor.getState();
        }
        const file = { ...files[index], ...opts };
        if ('readOnly' in opts) {
            enqueueEffect(
                file,
                opts.readOnly ? readOnlyEffect : editableEffect,
            );
        }
        files = [...files.slice(0, index), file, ...files.slice(index + 1)];
        selectTab(currentIndex);
        notifyProjectChanged();
    }

    /** @param {number} src @param {number} dest */
    function reorder(src, dest) {
        let newFiles;
        if (src < dest) {
            newFiles = [
                ...files.slice(0, src),
                ...files.slice(src + 1, dest + 1),
                files[src],
                ...files.slice(dest + 1),
            ];
        } else {
            newFiles = [
                ...files.slice(0, dest),
                files[src],
                ...files.slice(dest, src),
                ...files.slice(src + 1),
            ];
        }
        const newIndex = newFiles.indexOf(currentFile);
        files = newFiles;
        currentIndex = newIndex;
        notifyProjectChanged();
    }

    /** @param {Record<string, any>} file @param {any} effect */
    function enqueueEffect(file, effect) {
        file.effects = file.effects ? [...file.effects, effect] : [effect];
    }

    /** @param {Record<string, any> | null | undefined} file */
    async function applyEffects(file) {
        if (editor && file && file.effects && file.effects.length > 0) {
            await tick();
            const view = editor.getView();
            if (view && view.state === file.state) {
                view.dispatch({ effects: file.effects });
                file.effects = [];
            }
        }
    }

    let getModelResolve = $state(null);
    /** @param {boolean} addChecker */
    async function getModel(addChecker) {
        busyCount++;
        currentFile.state = editor.getState();
        let modelFile = isModel ? currentFile : null;
        if (!modelFile) {
            if (modelFiles.length === 0) {
                // No models to run
                busyCount--;
                return false;
            } else if (modelFiles.length === 1) {
                // Only one model, so use it
                modelFile = files.find((f) => f.name === modelFiles[0]);
            } else {
                try {
                    const result = await new Promise((resolve, _reject) => {
                        getModelResolve = resolve;
                        needsModel = true;
                    });
                    if (!result) {
                        // Cancelled
                        busyCount--;
                        return false;
                    }
                    modelFile = files.find((f) => f.name === result.modelFile);
                } finally {
                    needsModel = false;
                }
            }
        }

        const model = new MiniZinc.Model();
        const fileList = [modelFile.name];
        if (addChecker) {
            const modelFileName = modelFile.name.substring(
                0,
                modelFile.name.length - 4,
            );
            const checker = files.find(
                (f) =>
                    f.name === `${modelFileName}.mzc` ||
                    f.name === `${modelFileName}.mzc.mzn`,
            );
            if (checker) {
                fileList.push(checker.name);
            }
        }
        if (modelFile !== currentFile) {
            fileList.push(currentFile.name);
        }
        for (const file of files) {
            model.addFile(
                file.name,
                file.state.doc.toString(),
                fileList.indexOf(file.name) !== -1,
            );
        }
        try {
            const { input } = await model.interface({
                options: solverConfig.getCompilationConfiguration(
                    currentSolver.id,
                ),
            });
            if (Object.keys(input).length > 0) {
                const params = {};
                for (const key in input) {
                    params[key] = parameterModalParameters[key];
                }
                parameterModalParameters = params;
                if (
                    isData &&
                    parameterModalDataFiles.indexOf(currentFile.name) === -1
                ) {
                    // Ensure the currently running file is selected
                    parameterModalDataFiles = [
                        ...parameterModalDataFiles,
                        currentFile.name,
                    ];
                }
                try {
                    const result = await new Promise((resolve, _reject) => {
                        getModelResolve = resolve;
                        needsData = true;
                    });
                    if (!result) {
                        // Cancelled
                        busyCount--;
                        return false;
                    }
                    if (result.parameters) {
                        let dzn = '';
                        for (const key in result.parameters) {
                            if (result.parameters[key].trim().length > 0) {
                                dzn += `${key} = ${result.parameters[key]};\n`;
                            }
                        }
                        model.addDznString(dzn);
                        parameterModalParameters = result.parameters;
                    } else {
                        for (const file of result.dataFiles) {
                            if (fileList.indexOf(file) === -1) {
                                model.addFile(file);
                                fileList.push(file);
                            }
                        }
                        parameterModalDataFiles = result.dataFiles;
                    }
                } finally {
                    needsData = false;
                }
            }
        } catch (e) {
            // Ignore and just run
            console.error(e);
        }
        busyCount--;
        return { model, fileList };
    }

    export async function run() {
        if (isFzn) {
            const model = new MiniZinc.Model();
            model.addFile(currentFile.name, currentFile.state.doc.toString());
            const fileList = [currentFile.name];
            const options = solverConfig.getSolvingConfiguration(
                currentSolver.id,
            );
            await runWith(model, fileList, options);
            return;
        }
        const mznModel = await getModel(true);
        if (!mznModel) {
            // Cancelled
            return;
        }
        const { model, fileList } = mznModel;
        const options = solverConfig.getSolvingConfiguration(currentSolver.id);
        await runWith(model, fileList, options);
    }

    /** @param {any} model @param {string[]} fileList @param {Record<string, any>} options */
    async function runWith(model, fileList, options) {
        onrunStarted?.({ files: fileList });
        hasRun = true;
        const startTime = Date.now();
        if (autoClearOutput) {
            output = [];
        }
        output = [
            ...output,
            {
                files: fileList,
                output: [],
            },
        ];
        minizinc = model.solve({
            options,
            jsonOutput: false,
        });
        resetVisualisation();
        minizinc.on('error', addOutput);
        minizinc.on('warning', addOutput);
        minizinc.on('solution', (v) => addOutput(v, Date.now() - startTime));
        minizinc.on('status', (v) => addOutput(v, Date.now() - startTime));
        minizinc.on('statistics', addOutput);
        minizinc.on('trace', (v) => addOutput(v, Date.now() - startTime));
        minizinc.on('statistics', addOutput);
        minizinc.on('comment', addOutput);
        minizinc.on('time', addOutput);
        minizinc.on('checker', addOutput);
        minizinc.on('stderr', addOutput);
        try {
            await minizinc;
            addOutput({
                type: 'exit',
                code: 0,
                runTime: Date.now() - startTime,
            });
            onrunFinished?.({ files: fileList });
        } catch (e) {
            addOutput({
                type: 'exit',
                code: e.code,
                runTime: Date.now() - startTime,
            });
            onrunError?.({
                files: fileList,
                error: { message: e instanceof Error ? e.message : String(e) },
            });
        }
        minizinc = null;
    }

    export async function compile() {
        hasRun = true;
        const mznModel = await getModel(true);
        if (!mznModel) {
            // Cancelled
            return;
        }
        resetVisualisation();
        const { model, fileList } = mznModel;
        const name = fileList[0];
        onrunStarted?.({ files: fileList, isCompile: true });
        const startTime = Date.now();
        if (autoClearOutput) {
            output = [];
        }
        output = [
            ...output,
            {
                files: fileList,
                isCompile: true,
                output: [],
            },
        ];
        minizinc = model.compile({
            options: solverConfig.getCompilationConfiguration(currentSolver.id),
        });
        minizinc.on('error', addOutput);
        minizinc.on('warning', addOutput);
        minizinc.on('statistics', addOutput);
        minizinc.on('trace', addOutput);
        minizinc.on('statistics', addOutput);
        minizinc.on('stderr', addOutput);
        try {
            const fzn = await minizinc;
            const stem = name.substring(0, name.indexOf('.'));
            let fznFile = `${stem}.fzn`;
            let i = 1;
            while (files.find((f) => f.name === fznFile)) {
                fznFile = `${stem}-${i}.fzn`;
                i++;
            }
            files = [
                ...files,
                {
                    name: fznFile,
                    state: EditorState.create({
                        extensions: getExtensions('.fzn', checkCode, darkMode),
                        doc: fzn,
                    }),
                },
            ];
            selectTab(files.length - 1);
            notifyProjectChanged();
            addOutput({
                type: 'exit',
                code: 0,
                runTime: Date.now() - startTime,
            });
            onrunFinished?.({ files: fileList, isCompile: true });
        } catch (e) {
            addOutput({
                type: 'exit',
                code: e.code,
                runTime: Date.now() - startTime,
            });
            onrunError?.({
                files: fileList,
                isCompile: true,
                error: { message: e instanceof Error ? e.message : String(e) },
            });
        }
        minizinc = null;
    }

    function stop() {
        if (!minizinc) {
            return;
        }
        addOutput({ type: 'cancel' });
        minizinc.cancel();
    }

    let visQueue = null;
    /** @param {any} value @param {number} [time] */
    function addOutput(value, time) {
        if (visQueue) {
            visQueue.then(() => {
                visQueue = processVisMessage(value, time);
            });
        } else {
            visQueue = processVisMessage(value, time);
        }
        output[output.length - 1].output.push(value);
        output = output; // Force update
        onoutput?.(value);
    }

    export function clearOutput() {
        output = [];
    }

    function resetVisualisation() {
        if (visualisation) {
            visualisation.reset();
        }
        hasVisualisation = false;
        visualisationOpen = false;
    }

    /** @param {any} value @param {number} [time] */
    async function processVisMessage(value, time) {
        if (value.type === 'trace' && value.section.startsWith('mzn_vis_')) {
            if (!hasVisualisation) {
                hasVisualisation = true;
                visualisationOpen = true;
            }
            await tick();
            const file = files.find((f) => f.name === value.message.url);
            let html = null;
            if (file) {
                html = file.state.doc.toString();
            } else {
                try {
                    html = await MiniZinc.readStdlibFileContents(
                        value.message.url,
                    );
                } catch (e) {
                    console.error(e);
                    return;
                }
            }
            if (html === null) {
                console.error(
                    `Failed to get visualisation file ${value.message.url}`,
                );
                return;
            }
            visualisation.addVisualisation(
                value.section,
                html,
                value.message.userData,
            );
            return;
        }
        if (hasVisualisation) {
            while (!visualisation) {
                await tick();
            }
            switch (value.type) {
                case 'solution':
                    visualisation.addSolution(
                        value.sections
                            .filter((s) => s.startsWith('mzn_vis_'))
                            .reduce(
                                (acc, x) => ({ ...acc, [x]: value.output[x] }),
                                {},
                            ),
                        'time' in value ? value.time : time,
                    );
                    break;
                case 'status':
                    visualisation.status(
                        value.status,
                        'time' in value ? value.time : time,
                    );
                    break;
                case 'exit':
                    visualisation.status('time' in value ? value.time : time);
                    break;
            }
        }
    }

    export function getProject() {
        if (currentFile && !isLoadingProject) {
            currentFile.state = editor.getState();
        }
        return {
            files: files.map((f) => ({
                name: f.name,
                contents: f.state.doc.toString(),
                ...(f.hidden ? { hidden: true } : {}),
                ...(f.readOnly ? { readOnly: true } : {}),
                ...(f.readOnlyLines ? { readOnlyLines: f.readOnlyLines } : {}),
            })),
            tab: currentIndex,
            solverId: currentSolver.id,
            solverConfig: solverConfig.save(),
            minizincVersion: edgeMiniZinc ? 'edge' : 'latest',
        };
    }

    let generatingProject = $state(false);
    async function downloadProject() {
        generatingProject = true;
        try {
            const JSZip = (await import('jszip')).default;
            const FileSaver = (await import('file-saver')).default;
            const project = getProject();
            const projectFiles = files.map((f) => f.name);
            const openFiles = files.filter((f) => !f.hidden).map((f) => f.name);
            let solverId = currentSolver.id;
            if (solverId === 'org.minizinc.gecode_presolver') {
                solverId = 'org.gecode.gecode';
            } else if (solverId === 'org.minizinc.chuffed') {
                solverId = 'org.chuffed.chuffed';
            }
            const zip = new JSZip();
            for (const file of project.files) {
                zip.file(file.name, file.contents);
            }
            zip.file(
                'Project.mzp',
                JSON.stringify({
                    version: 105,
                    projectFiles,
                    openFiles,
                    openTab: project.tab,
                    selectedBuiltinConfigId: solverId,
                    selectedBuiltinConfigVersion: 'default',
                }),
            );
            const blob = await zip.generateAsync({ type: 'blob' });
            FileSaver.saveAs(blob, 'Project.zip');
        } catch (e) {
            console.error(e);
        } finally {
            generatingProject = false;
        }
    }

    let shareUrl = $state(null);
    let shareProject = $state(null);
    /** @param {string} base */
    function getShareUrl(base) {
        const project = getProject();
        const url = new URL(base);
        url.hash = `#project=${encodeURIComponent(JSON.stringify(project))}`;
        return url.toString();
    }

    function openShareModal() {
        shareProject = getProject();
        shareUrl = getShareUrl(window.location.href);
    }

    function openInExternalPlayground() {
        window.open(getShareUrl(window.location.href), '_blank').focus();
    }

    let prevText = null;
    /** @param {any} editor */
    async function checkCode(editor) {
        const view = editor.view;
        if (
            busyCount !== 0 ||
            !currentSolver ||
            !currentFile ||
            !currentFile.name.endsWith('.mzn')
        ) {
            return;
        }
        try {
            const text = view.state.doc.toString();
            if (text === prevText) {
                return;
            }
            prevText = text;
            const model = new MiniZinc.Model();
            for (const file of files) {
                model.addFile(file.name, file.state.doc.toString(), false);
            }
            const name = model.addString(text);
            const errors = await model.check({
                options: solverConfig.getCompilationConfiguration(
                    currentSolver.id,
                ),
            });
            if (view.state.doc.toString() !== text) {
                // Out of date
                return;
            }
            addErrors(
                text,
                errors.filter((e) => e.location.filename === name),
                view,
            );
        } catch (e) {
            console.error(e);
        }
    }

    /** @param {{ filename: string, firstLine: number, firstColumn: number }} loc */
    function gotoLocation(loc) {
        const i = files.findIndex((f) => f.name === loc.filename);
        if (i !== -1) {
            selectTab(i);
            const text = files[i].state.doc.toString();
            const pos = lineCharToPos(loc.firstLine, loc.firstColumn, text);
            editor.focus();
            editor.setCursor(pos);
        }
    }

    function switchOrientation() {
        if (splitterDirection === 'horizontal') {
            splitterDirection = 'vertical';
        } else {
            splitterDirection = 'horizontal';
        }
    }

    /** @param {{ item: any }} payload */
    function selectVersion({ item }) {
        edgeMiniZinc = item === minizincVersions.edge;
    }

    /** @param {boolean} dark */
    function setTheme(dark) {
        if (currentFile && !isLoadingProject) {
            currentFile.state = editor.getState();
        }
        files.forEach((file) =>
            enqueueEffect(file, dark ? darkThemeEffect : lightThemeEffect),
        );
        applyEffects(currentFile);
    }

    /**
     * @type Visualisation
     */
    let visualisation = $state();
    let hasVisualisation = $state(false);
    let visualisationOpen = $state(false);

    /** @param {{ modelFile: string, dataFiles?: string[], options?: Record<string, any> }} cfg */
    function visReSolve(cfg) {
        if (minizinc) {
            stop();
        }

        const fileList = [cfg.modelFile];
        const modelFileName = cfg.modelFile.substring(
            0,
            cfg.modelFile.length - 4,
        );
        const checker = files.find(
            (f) =>
                f.name === `${modelFileName}.mzc` ||
                f.name === `${modelFileName}.mzc.mzn`,
        );
        if (checker) {
            fileList.push(checker.name);
        }
        if (cfg.dataFiles) {
            for (const dzn of cfg.dataFiles) {
                fileList.push(dzn);
            }
        }
        const model = new MiniZinc.Model();
        for (const file of files) {
            model.addFile(
                file.name,
                file.state.doc.toString(),
                fileList.indexOf(file.name) !== -1,
            );
        }
        runWith(
            model,
            fileList,
            cfg.options ||
                solverConfig.getSolvingConfiguration(currentSolver.id),
        );
    }

    export function isDefaultSolver() {
        return (
            currentSolverIndex ===
            (solvers.findIndex((s) => s.extraInfo && s.extraInfo.isDefault) ||
                0)
        );
    }

    export function isDefaultSolverConfig() {
        return solverConfig.isDefault();
    }
    let versionItems = $derived([
        minizincVersions.latest,
        minizincVersions.edge,
    ]);
    $effect(() => {
        const useEdge = edgeMiniZinc;
        untrack(() => loadSolvers(useEdge));
    });
    $effect(() => {
        projectLoad = loadProject(project);
    });
    let visibleFileCount = $derived(files.filter((f) => !f.hidden).length);
    let currentFile = $derived(
        currentIndex < files.length ? files[currentIndex] : null,
    );
    let editorState = $derived(currentFile ? currentFile.state : null);
    let solvers = $derived(
        enabledSolvers
            ? allSolvers.filter((s) => enabledSolvers.indexOf(s.id) !== -1)
            : allSolvers,
    );
    let currentSolver = $derived(
        currentSolverIndex >= 0 && currentSolverIndex < solvers.length
            ? solvers[currentSolverIndex]
            : null,
    );
    let isModel = $derived(
        currentFile &&
            currentFile.name.endsWith('.mzn') &&
            !currentFile.name.endsWith('.mzc.mzn'),
    );
    let isData = $derived(
        currentFile &&
            (currentFile.name.endsWith('.dzn') ||
                currentFile.name.endsWith('.json')),
    );
    let isFzn = $derived(currentFile && currentFile.name.endsWith('.fzn'));
    let canRun = $derived(
        busyCount === 0 && currentSolver && (isModel || isData || isFzn),
    );
    let canCompile = $derived(
        busyCount === 0 && currentSolver && (isModel || isData),
    );
    let splitterShowPanel = $derived(
        !hideOutputOnStartup || hasRun ? 'all' : 'a',
    );
    let isRunning = $derived(minizinc !== null);
    let modelFiles = $derived(
        files
            .filter(
                (f) => f.name.endsWith('.mzn') && !f.name.endsWith('.mzc.mzn'),
            )
            .map((f) => f.name),
    );
    let dataFiles = $derived(
        files
            .filter((f) => f.name.endsWith('.dzn') || f.name.endsWith('.json'))
            .map((f) => f.name),
    );
    $effect(() => {
        enforceValidSolver(solvers, currentSolverIndex);
    });
    let currentStdFlags = $derived(currentSolver ? currentSolver.stdFlags : []);
    $effect(() => {
        applyEffects(currentFile);
    });
    let darkMode = $derived(
        { dark: true, light: false, auto: $browserDarkMode }[theme],
    );
    $effect(() => {
        const dark = darkMode;
        untrack(() => setTheme(dark));
    });
    $effect(() => {
        onsolversChanged?.({ solvers });
    });
</script>

<div class="mzn-playground">
    <div class="mzn-playground-wrapper" class:is-dark={darkMode}>
        <div class="stack">
            <div class="top">
                <nav class="navbar">
                    <div class="navbar-brand">
                        {@render navbarBeforeRunButtons?.({
                            isMobile: $screenMobile,
                        })}
                        <div class="navbar-item is-expanded">
                            <div class="field navbar-run-buttons has-addons">
                                <div class="control">
                                    {#if isRunning}
                                        <button
                                            class="button is-danger"
                                            title="Cancel solving"
                                            onclick={stop}
                                        >
                                            <span>Stop</span>
                                            <span class="icon">
                                                <Fa icon={faStop} />
                                            </span>
                                        </button>
                                    {:else}
                                        <button
                                            class="button is-primary"
                                            title="Run the current file"
                                            onclick={run}
                                            disabled={!canRun}
                                        >
                                            <span>Run</span>
                                            <span class="icon">
                                                <Fa icon={faPlay} />
                                            </span>
                                        </button>
                                    {/if}
                                </div>
                                {#if !$screenMobile && compilationEnabled}
                                    <div class="control">
                                        <button
                                            class="button"
                                            title="Compile the current file and show the resultant FlatZinc"
                                            onclick={compile}
                                            disabled={isRunning || !canCompile}
                                        >
                                            <span>Compile</span>
                                        </button>
                                    </div>
                                {/if}
                                {#if !$screenMobile && showVersionSwitcher}
                                    <div class="control">
                                        <Dropdown
                                            items={versionItems}
                                            currentItem={edgeMiniZinc
                                                ? minizincVersions.edge
                                                : minizincVersions.latest}
                                            onselectItem={selectVersion}
                                            disabled={isRunning}
                                            title="Configure MiniZinc version"
                                        >
                                            {#snippet item({ item })}
                                                <span>
                                                    {item.label} ({item.detail})
                                                </span>
                                            {/snippet}
                                        </Dropdown>
                                    </div>
                                {/if}
                                {@render navbarRunButtons?.({
                                    isMobile: $screenMobile,
                                })}

                                {#if $screenMobile && showSolverDropdown && solvers.length > 0}
                                    <div class="control is-expanded">
                                        <div class="select is-fullwidth">
                                            <select
                                                bind:value={currentSolverIndex}
                                            >
                                                {#each solvers as solver, i}
                                                    <option value={i}>
                                                        {solver.name}
                                                        {solver.version}
                                                    </option>
                                                {/each}
                                            </select>
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        </div>
                        {@render navbarAfterRunButtons?.({
                            isMobile: $screenMobile,
                        })}
                        {#if showSolverDropdown && solvers.length > 0}
                            <div class="navbar-item is-hidden-mobile">
                                <div class="field has-addons">
                                    <div class="control">
                                        <button class="button is-static">
                                            Solver:
                                        </button>
                                    </div>
                                    <div class="control is-expanded">
                                        <div class="select is-fullwidth">
                                            <select
                                                bind:value={currentSolverIndex}
                                            >
                                                {#each solvers as solver, i}
                                                    <option value={i}>
                                                        {solver.name}
                                                        {solver.version}
                                                    </option>
                                                {/each}
                                            </select>
                                        </div>
                                    </div>

                                    {#if canEditSolverSettings}
                                        <div class="control">
                                            <button
                                                class="button is-primary"
                                                onclick={toggleSolverConfig}
                                                title="Solver configuration"
                                            >
                                                <span class="icon">
                                                    <Fa icon={faCog} />
                                                </span>
                                            </button>
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        {/if}
                        {@render navbarAfterSolverSelector?.({
                            isMobile: $screenMobile,
                        })}
                        <!-- svelte-ignore a11y_missing_attribute -->
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_interactive_supports_focus -->
                        <a
                            role="button"
                            class="navbar-burger"
                            class:is-active={menuActive}
                            aria-label="menu"
                            aria-expanded={menuActive}
                            onclick={() => {
                                menuActive = !menuActive;
                                showSolverConfig = false;
                            }}
                        >
                            <span aria-hidden="true"></span>
                            <span aria-hidden="true"></span>
                            <span aria-hidden="true"></span>
                        </a>
                    </div>
                    <div class="navbar-menu" class:is-active={menuActive}>
                        <div class="navbar-start is-hidden-tablet"></div>
                        <div class="navbar-end">
                            {#if $screenMobile}
                                {#if compilationEnabled && !isRunning && canCompile}
                                    <!-- svelte-ignore a11y_invalid_attribute -->
                                    <a
                                        class="navbar-item mobile-menu-item"
                                        href="javascript:void(0);"
                                        onclick={() => {
                                            compile();
                                            menuActive = false;
                                        }}
                                    >
                                        <span class="icon">
                                            <Fa icon={faHammer} />
                                        </span>
                                        <span>Compile current file</span>
                                    </a>
                                {/if}
                                {#if canEditSolverSettings && showSolverDropdown && solvers.length > 0}
                                    <!-- svelte-ignore a11y_invalid_attribute -->
                                    <a
                                        class="navbar-item mobile-menu-item"
                                        href="javascript:void(0);"
                                        onclick={() => {
                                            toggleSolverConfig();
                                            menuActive = false;
                                        }}
                                    >
                                        <span class="icon">
                                            <Fa icon={faCog} />
                                        </span>
                                        <span>Solver configuration</span>
                                    </a>
                                {/if}
                                {#if showVersionSwitcher && !isRunning}
                                    <!-- svelte-ignore a11y_invalid_attribute -->
                                    <a
                                        class="navbar-item mobile-menu-item"
                                        href="javascript:void(0);"
                                        onclick={() => {
                                            edgeMiniZinc = !edgeMiniZinc;
                                            menuActive = false;
                                        }}
                                    >
                                        <span class="icon">
                                            <Fa icon={faShuffle} />
                                        </span>
                                        <span
                                            >Switch to the {edgeMiniZinc
                                                ? 'latest'
                                                : 'edge'} version of MiniZinc</span
                                        >
                                    </a>
                                {/if}
                                {@render navbarBeforeShareButtons?.({
                                    isMobile: $screenMobile,
                                })}
                                {#if showShareButton && busyCount === 0}
                                    <!-- svelte-ignore a11y_invalid_attribute -->
                                    <a
                                        class="navbar-item mobile-menu-item"
                                        href="javascript:void(0);"
                                        onclick={() => {
                                            openShareModal();
                                            menuActive = false;
                                        }}
                                    >
                                        <span class="icon">
                                            <Fa icon={faShareNodes} />
                                        </span>
                                        <span>Share this project</span>
                                    </a>
                                {/if}
                                {#if showExternalPlaygroundButton && busyCount === 0}
                                    <!-- svelte-ignore a11y_invalid_attribute -->
                                    <a
                                        class="navbar-item mobile-menu-item"
                                        href="javascript:void(0);"
                                        onclick={() => {
                                            openInExternalPlayground();
                                            menuActive = false;
                                        }}
                                    >
                                        <span class="icon">
                                            <Fa
                                                icon={faArrowUpRightFromSquare}
                                            />
                                        </span>
                                        <span>Open in MiniZinc Playground</span>
                                    </a>
                                {/if}
                            {:else}
                                {@render navbarBeforeShareButtons?.({
                                    isMobile: $screenMobile,
                                })}
                                <div class="navbar-item">
                                    <div class="field has-addons">
                                        {#if showShareButton}
                                            <div class="control">
                                                <button
                                                    class="button is-primary"
                                                    title="Share"
                                                    disabled={busyCount !== 0}
                                                    onclick={openShareModal}
                                                >
                                                    <span class="icon">
                                                        <Fa
                                                            icon={faShareNodes}
                                                        />
                                                    </span>
                                                </button>
                                            </div>
                                        {/if}
                                        {#if showDownloadButton}
                                            <div class="control">
                                                <button
                                                    class="button"
                                                    title="Download project"
                                                    onclick={() =>
                                                        downloadProject()}
                                                    disabled={generatingProject ||
                                                        busyCount !== 0}
                                                >
                                                    <span class="icon">
                                                        <Fa icon={faDownload} />
                                                    </span>
                                                </button>
                                            </div>
                                        {/if}
                                        {#if showExternalPlaygroundButton}
                                            <div class="control">
                                                <button
                                                    class="button is-primary"
                                                    title="Open in playground"
                                                    disabled={busyCount !== 0}
                                                    onclick={openInExternalPlayground}
                                                >
                                                    <span class="icon">
                                                        <Fa
                                                            icon={faArrowUpRightFromSquare}
                                                        />
                                                    </span>
                                                </button>
                                            </div>
                                        {/if}
                                        {@render navbarShareButtons?.({
                                            isMobile: $screenMobile,
                                        })}
                                    </div>
                                </div>
                            {/if}
                            {@render navbarAfterShareButtons?.({
                                isMobile: $screenMobile,
                            })}
                        </div>
                    </div>
                </nav>
            </div>
            <div class="grow main-panel">
                <div class="left">
                    <SplitPanel
                        direction={splitterDirection}
                        bind:split={splitterSize}
                        showPanels={splitterShowPanel}
                    >
                        {#snippet panelA()}
                            <div class="panel stack">
                                {#if showTabs}
                                    <div class="top">
                                        <Tabs
                                            {files}
                                            {currentIndex}
                                            readonly={!canEditTabs}
                                            onselectTab={({ index }) =>
                                                selectTab(index)}
                                            onreorder={({ src, dest }) =>
                                                reorder(src, dest)}
                                            onnewFile={() =>
                                                (newFileRequested = true)}
                                            onrename={rename}
                                            onclose={({ index }) =>
                                                (deleteFileRequested = index)}
                                            onmanageFiles={() =>
                                                (managingFiles = true)}
                                        />
                                    </div>
                                {/if}
                                <div class="grow">
                                    {#if editorState}
                                        <Editor
                                            state={editorState}
                                            bind:this={editor}
                                            onChange={editorChanged}
                                        />
                                    {/if}
                                </div>
                            </div>
                        {/snippet}
                        {#snippet panelB()}
                            <div class="panel stack">
                                {#if hasVisualisation}
                                    <div class="top">
                                        <div class="tabs is-boxed">
                                            <ul>
                                                <li
                                                    class:is-active={!visualisationOpen}
                                                >
                                                    <!-- svelte-ignore a11y_invalid_attribute -->
                                                    <!-- svelte-ignore a11y_no_static_element_interactions-->
                                                    <a
                                                        href="javascript:void(0);"
                                                        onclick={() => {
                                                            visualisationOpen = false;
                                                        }}>Output</a
                                                    >
                                                </li>
                                                <li
                                                    class:is-active={visualisationOpen}
                                                >
                                                    <!-- svelte-ignore a11y_invalid_attribute -->
                                                    <!-- svelte-ignore a11y_no_static_element_interactions-->
                                                    <a
                                                        href="javascript:void(0);"
                                                        onclick={() => {
                                                            visualisationOpen = true;
                                                        }}>Visualisation</a
                                                    >
                                                </li>
                                                {#if canSwitchOrientation}
                                                    <li class="tab-end">
                                                        <button
                                                            class="button is-small"
                                                            title="Switch orientation"
                                                            onclick={switchOrientation}
                                                        >
                                                            <span class="icon"
                                                                ><Fa
                                                                    icon={faRotate}
                                                                /></span
                                                            >
                                                        </button>
                                                    </li>
                                                {/if}
                                            </ul>
                                        </div>
                                    </div>
                                {/if}
                                <div class="grow">
                                    <div
                                        class="tab-window"
                                        class:visible={visualisationOpen}
                                    >
                                        <Visualisation
                                            bind:this={visualisation}
                                            {files}
                                            onsolve={visReSolve}
                                        />
                                    </div>
                                    <div
                                        class="tab-window"
                                        class:visible={!hasVisualisation ||
                                            !visualisationOpen}
                                    >
                                        <Output
                                            {output}
                                            onclear={clearOutput}
                                            ongoto={({ location }) =>
                                                gotoLocation(location)}
                                            bind:autoClearOutput
                                            {showClearOutput}
                                            {showAutoClearOutput}
                                            showSectionToggles={showOutputSectionToggles}
                                            showRightControls={showOutputRightControls}
                                            isTab={hasVisualisation}
                                        >
                                            {#snippet beforeRightControls()}
                                                <p class="control">
                                                    {#if canSwitchOrientation && !hasVisualisation}
                                                        <button
                                                            class="button is-small"
                                                            title="Switch orientation"
                                                            onclick={switchOrientation}
                                                        >
                                                            <span class="icon"
                                                                ><Fa
                                                                    icon={faRotate}
                                                                /></span
                                                            >
                                                        </button>
                                                    {/if}
                                                </p>
                                            {/snippet}
                                        </Output>
                                    </div>
                                </div>
                            </div>
                        {/snippet}
                    </SplitPanel>
                </div>
                <SolverConfig
                    active={showSolverConfig}
                    bind:this={solverConfig}
                    stdFlags={currentStdFlags}
                    onclose={() => (showSolverConfig = false)}
                />
            </div>
        </div>

        <ManageFilesModal
            active={managingFiles}
            {files}
            onclose={() => (managingFiles = false)}
            ondelete={({ index }) => (deleteFileRequested = index)}
            onmodifyFile={({ index, options }) => modifyFile(index, options)}
            onnewFile={() => (newFileRequested = true)}
        />

        <NewFileModal
            active={newFileRequested}
            oncancel={() => (newFileRequested = false)}
            onnew={({ type }) => newFile(type)}
            onopen={importFiles}
        />

        <Modal
            active={deleteFileRequested !== null}
            title="Delete file"
            oncancel={() => (deleteFileRequested = null)}
        >
            <p>
                Are you sure you wish to delete <code
                    >{files[deleteFileRequested].name}</code
                >?
            </p>
            <p>This cannot be undone.</p>
            {#snippet footer()}
                <div>
                    <button
                        class="button is-danger"
                        onclick={() => closeFile(deleteFileRequested)}
                    >
                        Delete
                    </button>
                    <button
                        type="button"
                        class="button"
                        onclick={() => (deleteFileRequested = null)}
                        >Cancel</button
                    >
                </div>
            {/snippet}
        </Modal>

        <ModelModal
            active={needsModel}
            {modelFiles}
            onaccept={getModelResolve}
            oncancel={() => getModelResolve(false)}
        />

        <ParameterModal
            active={needsData}
            {dataFiles}
            parameters={parameterModalParameters}
            onaccept={getModelResolve}
            oncancel={() => getModelResolve(false)}
        />

        <ShareModal
            active={shareUrl}
            {shareUrl}
            project={shareProject}
            oncancel={() => (shareUrl = null)}
        />
        {@render children?.()}
    </div>
</div>

<style>
    .mzn-playground {
        height: 100%;
    }
    .stack,
    .mzn-playground-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
    }
    .stack > .grow {
        flex: 1 1 0;
        overflow: hidden;
    }
    .main-panel {
        display: flex;
    }
    .main-panel > * {
        height: 100%;
        overflow: hidden;
    }
    .main-panel > .left {
        flex: 1 1 0;
    }
    .stack > .top {
        flex: 0 0 auto;
    }
    .panel {
        height: 100%;
    }
    .tab-end {
        flex: 1 1 auto;
        display: flex !important;
        justify-content: flex-end;
        padding-right: 0.5rem;
    }
    .tab-window {
        display: none;
        height: 100%;
    }
    .tab-window.visible {
        display: block;
    }

    .mobile-menu-item {
        display: flex;
        align-items: center;
    }

    .mobile-menu-item .icon:first-child {
        margin-right: 0.5rem;
    }

    .mobile-menu-item .icon:last-child {
        margin-left: 0.5rem;
    }

    @media only screen and (max-width: 768px) {
        .navbar-run-buttons {
            flex-grow: 1;
            flex-shrink: 1;
        }
    }
</style>
