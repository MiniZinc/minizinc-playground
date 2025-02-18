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
        faClipboard,
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
    import ModelModal from './ModelModal.svelte';
    import ParameterModal from './ParameterModal.svelte';
    import SolverConfig from './SolverConfig.svelte';
    import Dropdown from './Dropdown.svelte';
    import { addErrors, lineCharToPos } from '../lang/underline';
    import { createEventDispatcher, onMount, tick } from 'svelte';

    import * as MiniZincLatest from 'https://cdn.jsdelivr.net/npm/minizinc/dist/minizinc.mjs';
    import * as MiniZincEdge from 'https://cdn.jsdelivr.net/npm/minizinc@edge/dist/minizinc.mjs';
    import { browserDarkMode, screenMobile } from './mediaQueries';

    export let showVersionSwitcher = true;
    export let showSolverDropdown = true;
    export let edgeMiniZinc = false;
    export let autoClearOutput = false;
    export let showTabs = true;
    export let canEditTabs = true;
    export let compilationEnabled = true;
    export let project;
    /**
     * @type {any[] | null}
     */
    export let enabledSolvers = null;
    export let canEditSolverSettings = true;
    export let showShareButton = true;
    export let showDownloadButton = true;
    export let externalPlaygroundURL = null;
    export let splitterDirection = 'vertical';
    export let splitterSize = 75;
    export let canSwitchOrientation = true;
    export let showClearOutput = true;
    export let showAutoClearOutput = true;
    export let showOutputSectionToggles = true;
    export let showOutputRightControls = true;
    export let theme = 'auto';
    export let hideOutputOnStartup = true;
    export let autoFocus = true;

    const dispatch = createEventDispatcher();

    let busyState = 0;
    let allSolvers = [];
    let solversLoaded;
    /**
     * @type typeof MiniZincLatest
     */
    let MiniZinc;

    let minizincVersions = {
        latest: { label: 'Latest', detail: 'stable' },
        edge: { label: 'Edge', detail: 'development' },
    };
    $: versionItems = [minizincVersions.latest, minizincVersions.edge];

    function loadSolvers(e) {
        const toLoad = edgeMiniZinc ? MiniZincEdge : MiniZincLatest;
        if (MiniZinc !== toLoad) {
            busyState++;
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
                const key = edgeMiniZinc ? 'edge' : 'latest';
                minizincVersions = {
                    ...minizincVersions,
                    [key]: { ...minizincVersions[key], detail: mznVersion },
                };
                allSolvers = await MiniZinc.solvers();
                await tick();
                busyState--;
                resolve();
            });
        }
        return solversLoaded;
    }

    $: loadSolvers(edgeMiniZinc);

    const mounted = new Promise((resolve, _reject) => {
        onMount(() => {
            loadSolvers();
            resolve();
        });
    });

    $: loadProject(project);

    export async function loadProject(project) {
        edgeMiniZinc = project.minizincVersion === 'edge';
        await mounted;
        files = [];
        openFiles(project.files, autoFocus);
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
    }

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
    }

    export function hasFiles() {
        return files.length > 0;
    }

    let editor;
    let files = [];

    let menuActive = false;

    let currentIndex = 0;
    let solverConfig;

    let newFileRequested = false;
    let deleteFileRequested = null;
    let managingFiles = false;

    let needsModel = false;
    let needsData = null;

    $: visibleFileCount = files.filter((f) => !f.hidden).length;
    $: state = currentFile ? currentFile.state : null;
    $: canRun =
        busyState === 0 && currentSolver && (isModel || isData || isFzn);
    $: canCompile = busyState === 0 && currentSolver && (isModel || isData);

    let hasRun = false;
    $: splitterShowPanel = !hideOutputOnStartup || hasRun ? 'all' : 'a';

    let output = [];
    let minizinc = null;
    $: isRunning = minizinc !== null;

    $: currentFile = currentIndex < files.length ? files[currentIndex] : null;
    $: isModel =
        currentFile &&
        currentFile.name.endsWith('.mzn') &&
        !currentFile.name.endsWith('.mzc.mzn');
    $: isData =
        currentFile &&
        (currentFile.name.endsWith('.dzn') ||
            currentFile.name.endsWith('.json'));
    $: isFzn = currentFile && currentFile.name.endsWith('.fzn');

    $: modelFiles = files
        .filter((f) => f.name.endsWith('.mzn') && !f.name.endsWith('.mzc.mzn'))
        .map((f) => f.name);
    $: dataFiles = files
        .filter((f) => f.name.endsWith('.dzn') || f.name.endsWith('.json'))
        .map((f) => f.name);

    let parameterModalDataFiles = [];
    let parameterModalParameters = {};

    $: solvers = enabledSolvers
        ? allSolvers.filter((s) => enabledSolvers.indexOf(s.id) !== -1)
        : allSolvers;
    let currentSolverIndex = -1;

    $: enforceValidSolver(solvers, currentSolverIndex);
    async function enforceValidSolver(_solvers, _currentSolverIndex) {
        await loadSolvers();
        if (currentSolverIndex < 0 || currentSolverIndex >= solvers.length) {
            const idx = solvers.findIndex(
                (s) => s.extraInfo && s.extraInfo.isDefault,
            );
            if (idx !== -1) {
                currentSolverIndex = idx;
            }
        }
    }

    $: currentSolver =
        currentSolverIndex >= 0 && currentSolverIndex < solvers.length
            ? solvers[currentSolverIndex]
            : null;
    $: currentStdFlags = currentSolver ? currentSolver.stdFlags : [];

    let showSolverConfig = false;
    function toggleSolverConfig() {
        showSolverConfig = !showSolverConfig;
    }

    async function selectTab(index, focus = true) {
        if (editor) {
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

    function newFile(suffix) {
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
        selectTab(files.length - 1);
        newFileRequested = false;
    }

    function openFiles(toOpen, focus = true) {
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
        selectTab(files.length - 1, focus);
        newFileRequested = false;
    }

    function rename(e) {
        const { index, name, suffix } = e.detail;
        let dest = name;
        let i = 2;
        while (files.some((f) => f === dest + suffix)) {
            dest = `${name}-${i++}`;
        }
        if (currentFile) {
            currentFile.state = editor.getState();
        }
        files = [
            ...files.slice(0, index),
            { ...files[index], name: name + suffix },
            ...files.slice(index + 1),
        ];
    }

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
    }

    function modifyFile(index, opts) {
        if (currentFile) {
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
    }

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
    }

    function enqueueEffect(file, effect) {
        file.effects = file.effects ? [...file.effects, effect] : [effect];
    }

    $: applyEffects(currentFile);
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

    let getModelResolve = null;
    async function getModel(addChecker) {
        busyState++;
        currentFile.state = editor.getState();
        let modelFile = isModel ? currentFile : null;
        if (!modelFile) {
            if (modelFiles.length === 0) {
                // No models to run
                busyState--;
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
                        busyState--;
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
                        busyState--;
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
        busyState--;
        return { model, fileList };
    }

    async function run() {
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

    async function runWith(model, fileList, options) {
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
        } catch (e) {
            addOutput({
                type: 'exit',
                code: e.code,
                runTime: Date.now() - startTime,
            });
        }
        minizinc = null;
    }

    async function compile() {
        hasRun = true;
        const mznModel = await getModel(true);
        if (!mznModel) {
            // Cancelled
            return;
        }
        resetVisualisation();
        const { model, fileList } = mznModel;
        const name = fileList[0];
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
            files = [
                ...files,
                {
                    name: `${name.substring(0, name.indexOf('.'))}.fzn`,
                    state: EditorState.create({
                        extensions: getExtensions('.fzn', checkCode, darkMode),
                        doc: fzn,
                    }),
                },
            ];
            selectTab(files.length - 1);
            addOutput({
                type: 'exit',
                code: 0,
                runTime: Date.now() - startTime,
            });
        } catch (e) {
            addOutput({
                type: 'exit',
                code: e.code,
                runTime: Date.now() - startTime,
            });
        }
        minizinc = null;
    }

    function stop() {
        addOutput({ type: 'cancel' });
        minizinc.cancel();
    }

    let visQueue = null;
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
    }

    function resetVisualisation() {
        if (visualisation) {
            visualisation.reset();
        }
        hasVisualisation = false;
        visualisationOpen = false;
    }

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
        if (currentFile) {
            currentFile.state = editor.getState();
        }
        return {
            files: files.map((f) => ({
                name: f.name,
                contents: f.state.doc.toString(),
                ...(f.hidden ? { hidden: true } : {}),
                ...(f.readOnly ? { readOnly: true } : {}),
            })),
            tab: currentIndex,
            solverId: currentSolver.id,
            solverConfig: solverConfig.save(),
            minizincVersion: edgeMiniZinc ? 'edge' : 'latest',
        };
    }

    let generatingProject = false;
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

    let shareUrlInput;
    let shareUrl = null;
    let copiedShareUrl = false;
    function getShareUrl(base) {
        const project = getProject();
        const url = new URL(base);
        url.hash = `#project=${encodeURIComponent(JSON.stringify(project))}`;
        copiedShareUrl = false;
        return url.toString();
    }

    function copyShareUrl() {
        shareUrlInput.select();
        shareUrlInput.setSelectionRange(0, shareUrl.length);
        navigator.clipboard.writeText(shareUrl);
        copiedShareUrl = true;
    }

    function openInExternalPlayground() {
        if (externalPlaygroundURL) {
            window.open(getShareUrl(externalPlaygroundURL), '_blank').focus();
        }
    }

    let prevText = null;
    async function checkCode(editor) {
        const view = editor.view;
        if (
            busyState !== 0 ||
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

    function selectVersion(e) {
        edgeMiniZinc = e.detail.item === minizincVersions.edge;
    }

    $: darkMode = { dark: true, light: false, auto: $browserDarkMode }[theme];

    function setTheme(dark) {
        if (currentFile) {
            currentFile.state = editor.getState();
        }
        files.forEach((file) =>
            enqueueEffect(file, dark ? darkThemeEffect : lightThemeEffect),
        );
        applyEffects(currentFile);
    }
    $: setTheme(darkMode);

    /**
     * @type Visualisation
     */
    let visualisation;
    let hasVisualisation = false;
    let visualisationOpen = false;

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

    $: dispatch('solversChanged', { solvers });

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
</script>

<div class="mzn-playground">
    <div class="mzn-playground-wrapper" class:is-dark={darkMode}>
        <div class="stack">
            <div class="top">
                <nav class="navbar">
                    <div class="navbar-brand">
                        <slot
                            name="navbar-before-run-buttons"
                            isMobile={$screenMobile}
                        />
                        <div class="navbar-item is-expanded">
                            <div class="field navbar-run-buttons has-addons">
                                <div class="control">
                                    {#if isRunning}
                                        <button
                                            class="button is-danger"
                                            title="Cancel solving"
                                            on:click={stop}
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
                                            on:click={run}
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
                                            on:click={compile}
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
                                            on:selectItem={selectVersion}
                                            disabled={isRunning}
                                            title="Configure MiniZinc version"
                                        >
                                            <span slot="item" let:item>
                                                {item.label} ({item.detail})
                                            </span>
                                        </Dropdown>
                                    </div>
                                {/if}
                                <slot
                                    name="navbar-run-buttons"
                                    isMobile={$screenMobile}
                                />

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
                        <slot
                            name="navbar-after-run-buttons"
                            isMobile={$screenMobile}
                        />
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
                                                on:click={toggleSolverConfig}
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
                        <slot
                            name="navbar-after-solver-selector"
                            isMobile={$screenMobile}
                        />
                        <!-- svelte-ignore a11y-missing-attribute -->
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-interactive-supports-focus -->
                        <a
                            role="button"
                            class="navbar-burger"
                            class:is-active={menuActive}
                            aria-label="menu"
                            aria-expanded={menuActive}
                            on:click={() => {
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
                                    <!-- svelte-ignore a11y-invalid-attribute -->
                                    <a
                                        class="navbar-item mobile-menu-item"
                                        href="javascript:void(0);"
                                        on:click={() => {
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
                                    <!-- svelte-ignore a11y-invalid-attribute -->
                                    <a
                                        class="navbar-item mobile-menu-item"
                                        href="javascript:void(0);"
                                        on:click={() => {
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
                                    <!-- svelte-ignore a11y-invalid-attribute -->
                                    <a
                                        class="navbar-item mobile-menu-item"
                                        href="javascript:void(0);"
                                        on:click={() => {
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
                                <slot
                                    name="navbar-before-share-buttons"
                                    isMobile={$screenMobile}
                                />
                                {#if showShareButton && busyState === 0}
                                    <!-- svelte-ignore a11y-invalid-attribute -->
                                    <a
                                        class="navbar-item mobile-menu-item"
                                        href="javascript:void(0);"
                                        on:click={() => {
                                            shareUrl = getShareUrl(
                                                window.location.href,
                                            );
                                            menuActive = false;
                                        }}
                                    >
                                        <span class="icon">
                                            <Fa icon={faShareNodes} />
                                        </span>
                                        <span>Share this project</span>
                                    </a>
                                {/if}
                                {#if externalPlaygroundURL && busyState === 0}
                                    <!-- svelte-ignore a11y-invalid-attribute -->
                                    <a
                                        class="navbar-item mobile-menu-item"
                                        href="javascript:void(0);"
                                        on:click={() => {
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
                                <slot
                                    name="navbar-before-share-buttons"
                                    isMobile={$screenMobile}
                                />
                                <div class="navbar-item">
                                    <div class="field has-addons">
                                        {#if showShareButton}
                                            <div class="control">
                                                <button
                                                    class="button is-primary"
                                                    title="Share"
                                                    disabled={busyState !== 0}
                                                    on:click={() =>
                                                        (shareUrl = getShareUrl(
                                                            window.location
                                                                .href,
                                                        ))}
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
                                                    on:click={() =>
                                                        downloadProject()}
                                                    disabled={generatingProject ||
                                                        busyState !== 0}
                                                >
                                                    <span class="icon">
                                                        <Fa icon={faDownload} />
                                                    </span>
                                                </button>
                                            </div>
                                        {/if}
                                        {#if externalPlaygroundURL}
                                            <div class="control">
                                                <button
                                                    class="button is-primary"
                                                    title="Open in playground"
                                                    disabled={busyState !== 0}
                                                    on:click={openInExternalPlayground}
                                                >
                                                    <span class="icon">
                                                        <Fa
                                                            icon={faArrowUpRightFromSquare}
                                                        />
                                                    </span>
                                                </button>
                                            </div>
                                        {/if}
                                        <slot
                                            name="navbar-share-buttons"
                                            isMobile={$screenMobile}
                                        />
                                    </div>
                                </div>
                            {/if}
                            <slot
                                name="navbar-after-share-buttons"
                                isMobile={$screenMobile}
                            />
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
                        <div class="panel stack" slot="panelA">
                            {#if showTabs}
                                <div class="top">
                                    <Tabs
                                        {files}
                                        {currentIndex}
                                        readonly={!canEditTabs}
                                        on:selectTab={(e) =>
                                            selectTab(e.detail.index)}
                                        on:reorder={(e) =>
                                            reorder(
                                                e.detail.src,
                                                e.detail.dest,
                                            )}
                                        on:newFile={() =>
                                            (newFileRequested = true)}
                                        on:rename={rename}
                                        on:close={(e) =>
                                            (deleteFileRequested =
                                                e.detail.index)}
                                        on:manageFiles={() =>
                                            (managingFiles = true)}
                                    />
                                </div>
                            {/if}
                            <div class="grow">
                                {#if state}
                                    <Editor {state} bind:this={editor} />
                                {/if}
                            </div>
                        </div>
                        <div class="panel stack" slot="panelB">
                            {#if hasVisualisation}
                                <div class="top">
                                    <div class="tabs is-boxed">
                                        <ul>
                                            <li
                                                class:is-active={!visualisationOpen}
                                            >
                                                <!-- svelte-ignore a11y-invalid-attribute -->
                                                <!-- svelte-ignore a11y-no-static-element-interactions-->
                                                <a
                                                    href="javascript:void(0);"
                                                    on:click={() => {
                                                        visualisationOpen = false;
                                                    }}>Output</a
                                                >
                                            </li>
                                            <li
                                                class:is-active={visualisationOpen}
                                            >
                                                <!-- svelte-ignore a11y-invalid-attribute -->
                                                <!-- svelte-ignore a11y-no-static-element-interactions-->
                                                <a
                                                    href="javascript:void(0);"
                                                    on:click={() => {
                                                        visualisationOpen = true;
                                                    }}>Visualisation</a
                                                >
                                            </li>
                                            {#if canSwitchOrientation}
                                                <li class="tab-end">
                                                    <button
                                                        class="button is-small"
                                                        title="Switch orientation"
                                                        on:click={switchOrientation}
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
                                        on:solve={(e) => visReSolve(e.detail)}
                                    />
                                </div>
                                <div
                                    class="tab-window"
                                    class:visible={!hasVisualisation ||
                                        !visualisationOpen}
                                >
                                    <Output
                                        {output}
                                        on:clear={() => (output = [])}
                                        on:goto={(e) =>
                                            gotoLocation(e.detail.location)}
                                        bind:autoClearOutput
                                        {showClearOutput}
                                        {showAutoClearOutput}
                                        showSectionToggles={showOutputSectionToggles}
                                        showRightControls={showOutputRightControls}
                                        isTab={hasVisualisation}
                                    >
                                        <p
                                            class="control"
                                            slot="before-right-controls"
                                        >
                                            {#if canSwitchOrientation && !hasVisualisation}
                                                <button
                                                    class="button is-small"
                                                    title="Switch orientation"
                                                    on:click={switchOrientation}
                                                >
                                                    <span class="icon"
                                                        ><Fa
                                                            icon={faRotate}
                                                        /></span
                                                    >
                                                </button>
                                            {/if}
                                        </p>
                                    </Output>
                                </div>
                            </div>
                        </div>
                    </SplitPanel>
                </div>
                <SolverConfig
                    active={showSolverConfig}
                    bind:this={solverConfig}
                    stdFlags={currentStdFlags}
                    on:close={() => (showSolverConfig = false)}
                />
            </div>
        </div>

        <ManageFilesModal
            active={managingFiles}
            {files}
            on:close={() => (managingFiles = false)}
            on:delete={(e) => (deleteFileRequested = e.detail.index)}
            on:modifyFile={(e) => modifyFile(e.detail.index, e.detail.options)}
            on:newFile={() => (newFileRequested = true)}
        />

        <NewFileModal
            active={newFileRequested}
            on:cancel={() => (newFileRequested = false)}
            on:new={(e) => newFile(e.detail.type)}
            on:open={(e) => importFiles(e.detail)}
        />

        <Modal
            active={deleteFileRequested !== null}
            title="Delete file"
            on:cancel={() => (deleteFileRequested = null)}
        >
            <p>
                Are you sure you wish to delete <code
                    >{files[deleteFileRequested].name}</code
                >?
            </p>
            <p>This cannot be undone.</p>
            <div slot="footer">
                <button
                    class="button is-danger"
                    on:click={() => closeFile(deleteFileRequested)}
                >
                    Delete
                </button>
                <button
                    type="button"
                    class="button"
                    on:click={() => (deleteFileRequested = null)}>Cancel</button
                >
            </div>
        </Modal>

        <ModelModal
            active={needsModel}
            {modelFiles}
            on:accept={(e) => getModelResolve(e.detail)}
            on:cancel={() => getModelResolve(false)}
        />

        <ParameterModal
            active={needsData}
            {dataFiles}
            parameters={parameterModalParameters}
            on:accept={(e) => getModelResolve(e.detail)}
            on:cancel={() => getModelResolve(false)}
        />

        <Modal
            active={shareUrl}
            title="Share this project"
            on:cancel={() => (shareUrl = null)}
        >
            <div class="field has-addons">
                <p class="control is-expanded">
                    <input
                        bind:this={shareUrlInput}
                        class="input"
                        type="text"
                        value={shareUrl}
                        on:click={() => shareUrlInput.select()}
                        readonly
                    />
                </p>
                <p class="control">
                    <button
                        type="button"
                        class="button"
                        class:is-primary={!copiedShareUrl}
                        class:is-success={copiedShareUrl}
                        on:click={copyShareUrl}
                    >
                        <span class="icon"><Fa icon={faClipboard} /></span>
                    </button>
                </p>
            </div>
            <div slot="footer">
                <button
                    class="button is-primary"
                    on:click={() => (shareUrl = null)}
                >
                    Done
                </button>
            </div>
        </Modal>
        <slot />
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
