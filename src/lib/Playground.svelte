<script>
    import Editor from './Editor.svelte';
    import SplitPanel from './SplitPanel.svelte';
    import Tabs from './Tabs.svelte';
    import Fa from 'svelte-fa/src/fa.svelte';
    import {
        faPlay,
        faStop,
        faCog,
        faShareNodes,
        faDownload,
        faClipboard,
        faArrowUpRightFromSquare,
    } from '@fortawesome/free-solid-svg-icons';
    import Modal from './Modal.svelte';
    import { EditorState } from '@codemirror/state';
    import {
        MiniZincEditorExtensions,
        JSONEditorExtensions,
        ReadonlyTextExtensions,
        DataZincEditorExtensions,
    } from '../lang';
    import Output from './Output.svelte';
    import NewFileModal from './NewFileModal.svelte';
    import ModelModal from './ModelModal.svelte';
    import ParameterModal from './ParameterModal.svelte';
    import SolverConfig from './SolverConfig.svelte';
    import Dropdown from './Dropdown.svelte';
    import { addErrors, lineCharToPos } from '../lang/underline';
    import { onMount, tick } from 'svelte';
    import { EditorView } from 'codemirror';

    import * as MiniZincLatest from 'https://cdn.jsdelivr.net/npm/minizinc/dist/minizinc.mjs';
    import * as MiniZincEdge from 'https://cdn.jsdelivr.net/npm/minizinc@edge/dist/minizinc.mjs';

    export let showVersionSwitcher = true;
    export let edgeMiniZinc = false;
    export let autoClearOutput = false;
    export let canEditTabs = true;
    export let compilationEnabled = true;
    export let project;
    export let enabledSolvers = null;
    export let canEditSolverSettings = true;
    export let showShareButton = true;
    export let showDownloadButton = true;
    export let externalPlaygroundURL = null;
    export let canToggleShowHidden = true;
    export let showHidden = false;
    export let splitterDirection = 'vertical'
    export let splitterSize = 75;

    let busyState = 0;
    let allSolvers = [];
    let solversLoaded;
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
                        await MiniZinc.version()
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
        openFiles(project.files);
        currentIndex = project.tab || 0;
        if (project.solverId) {
            await loadSolvers();
            currentSolverIndex = solvers.findIndex(
                (s) => s.id === project.solverId
            );
        }
        if (project.solverConfig) {
            solverConfig.load(project.solverConfig);
        }
    }

    export function hasFiles() {
        return files.length > 0;
    }

    const mznExtensions = MiniZincEditorExtensions((e) => {
        checkCode(e.view);
    });

    let editor;
    let files = [];

    let currentIndex = 0;
    let solverConfig;

    let newFileRequested = false;
    let deleteFileRequested = null;

    let needsModel = false;
    let needsData = null;
    let dataFileTab = true;

    $: state = currentFile ? currentFile.state : null;
    $: canRun =
        busyState === 0 && currentSolver && (isModel || isData || isFzn);
    $: canCompile = busyState === 0 && currentSolver && (isModel || isData);

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

    let modelModalModel = null;
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
                (s) => s.extraInfo && s.extraInfo.isDefault
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

    function selectTab(index) {
        if (editor) {
            if (currentIndex < files.length) {
                currentFile.state = editor.getState();
                currentFile.scrollTop = editor.getView().scrollDOM.scrollTop;
                currentFile.scrollLeft = editor.getView().scrollDOM.scrollLeft;
            }
            while (!showHidden && index > 0 && files[index].hidden) {
                index--;
            }
            currentIndex = index;
            editor.focus();
            if (currentFile.scrollTop !== undefined) {
                editor.getView().requestMeasure({
                    read(view) {
                        view.scrollDOM.scrollTo(
                            currentFile.scrollLeft,
                            currentFile.scrollTop
                        );
                    },
                });
            }
        }
    }

    function getExtensions(suffix) {
        if (suffix === '.json' || suffix === '.mpc') {
            return JSONEditorExtensions;
        }
        if (suffix === '.mzc') {
            return ReadonlyTextExtensions;
        }
        if (suffix === '.dzn') {
            return DataZincEditorExtensions;
        }
        return mznExtensions;
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
                    extensions: getExtensions(suffix),
                }),
            },
        ];
        selectTab(files.length - 1);
        newFileRequested = false;
    }

    function openFiles(toOpen) {
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
            const extensions = getExtensions(suffix);
            if (file.readonlyContent) {
                extensions.push(EditorView.editable.of(false));
            }
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
        selectTab(files.length - 1);
        newFileRequested = false;
    }

    function rename(e) {
        const { index, name, suffix } = e.detail;
        let dest = name;
        let i = 2;
        while (files.some((f) => f === dest + suffix)) {
            dest = `${name}-${i++}`;
        }
        currentFile.state = editor.getState();
        files = [
            ...files.slice(0, index),
            { ...files[index], name: name + suffix },
            ...files.slice(index + 1),
        ];
    }

    function closeFile(index) {
        if (files.length === 1) {
            files = [
                {
                    name: 'Untitled.mzn',
                    state: EditorState.create({
                        extensions: mznExtensions,
                    }),
                },
            ];
        } else {
            files = [...files.slice(0, index), ...files.slice(index + 1)];
        }
        if (currentIndex >= files.length) {
            selectTab(files.length - 1);
        }
        deleteFileRequested = null;
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

    let getModelResolve = null;
    async function getModel(addChecker) {
        currentFile.state = editor.getState();
        let modelFile = isModel ? currentFile : null;
        if (!modelFile) {
            if (modelFiles.length === 0) {
                // No models to run
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
                modelFile.name.length - 4
            );
            const checker = files.find(
                (f) =>
                    f.name === `${modelFileName}.mzc` ||
                    f.name === `${modelFileName}.mzc.mzn`
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
                fileList.indexOf(file.name) !== -1
            );
        }
        try {
            const { input } = await model.interface({
                options: solverConfig.getCompilationConfiguration(
                    currentSolver.id
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
                        dataFileTab = false;
                        parameterModalParameters = result.parameters;
                    } else {
                        for (const file of result.dataFiles) {
                            if (fileList.indexOf(file) === -1) {
                                model.addFile(file);
                                fileList.push(file);
                            }
                        }
                        dataFileTab = true;
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
        return { model, fileList };
    }

    async function run() {
        busyState++;
        const mznModel = await getModel(true);
        if (!mznModel) {
            // Cancelled
            busyState--;
            return;
        }
        const { model, fileList } = mznModel;
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
            options: solverConfig.getSolvingConfiguration(currentSolver.id),
            jsonOutput: false,
        });
        busyState--;
        minizinc.on('error', addOutput);
        minizinc.on('warning', addOutput);
        minizinc.on('solution', addOutput);
        minizinc.on('status', addOutput);
        minizinc.on('statistics', addOutput);
        minizinc.on('trace', addOutput);
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
        busyState++;
        const mznModel = await getModel(true);
        if (!mznModel) {
            // Cancelled
            busyState--;
            return;
        }
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
        busyState--;
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
                        extensions: mznExtensions,
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

    async function addOutput(value) {
        output[output.length - 1].output.push(value);
        output = output; // Force update
    }

    export function getProject() {
        if (currentFile) {
            currentFile.state = editor.getState();
        }
        return {
            files: files.map((f) => ({
                name: f.name,
                contents: f.state.doc.toString(),
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
            const names = files.map((f) => f.name);
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
                    projectFiles: names,
                    openFiles: names,
                    openTab: project.tab,
                    selectedBuiltinConfigId: solverId,
                    selectedBuiltinConfigVersion: 'default',
                })
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

    let prevText = null;
    async function checkCode(view) {
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
                    currentSolver.id
                ),
            });
            if (view.state.doc.toString() !== text) {
                // Out of date
                return;
            }
            addErrors(
                text,
                errors.filter((e) => e.location.filename === name),
                view
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

    function selectVersion(e) {
        edgeMiniZinc = e.detail.item === minizincVersions.edge;
    }
</script>

<div class="mzn-playground">
    <div class="stack">
        <div class="top">
            <nav class="navbar">
                <div class="navbar-menu is-active">
                    <div class="navbar-start">
                        <slot name="navbar-before-run-buttons" />
                        <div class="navbar-item">
                            <div class="field has-addons">
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
                                {#if compilationEnabled}
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
                                {#if showVersionSwitcher}
                                    <div class="control">
                                        <Dropdown
                                            items={versionItems}
                                            currentItem={edgeMiniZinc
                                                ? minizincVersions.edge
                                                : minizincVersions.latest}
                                            on:selectItem={selectVersion}
                                        >
                                            <span slot="item" let:item>
                                                {item.label} ({item.detail})
                                            </span>
                                        </Dropdown>
                                    </div>
                                {/if}
                                <slot name="navbar-run-buttons" />
                            </div>
                        </div>
                        <slot name="navbar-after-run-buttons" />
                        {#if solvers.length > 0}
                            <div class="navbar-item">
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
                        <slot name="navbar-after-solver-selector" />
                    </div>

                    <div class="navbar-end">
                        <slot name="navbar-before-share-buttons" />
                        <div class="navbar-item">
                            <div class="field has-addons">
                                {#if showShareButton}
                                    <div class="control">
                                        <button
                                            class="button is-primary"
                                            title="Share"
                                            on:click={() =>
                                                (shareUrl = getShareUrl(
                                                    window.location.href
                                                ))}
                                        >
                                            <span class="icon">
                                                <Fa icon={faShareNodes} />
                                            </span>
                                        </button>
                                    </div>
                                {/if}
                                {#if showDownloadButton}
                                    <div class="control">
                                        <button
                                            class="button"
                                            title="Download project"
                                            on:click={() => downloadProject()}
                                            disabled={generatingProject}
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
                                            on:click={() => {
                                                window.location.href =
                                                    getShareUrl(
                                                        externalPlaygroundURL
                                                    );
                                            }}
                                        >
                                            <span class="icon">
                                                <Fa
                                                    icon={faArrowUpRightFromSquare}
                                                />
                                            </span>
                                        </button>
                                    </div>
                                {/if}
                                <slot name="navbar-share-buttons" />
                            </div>
                        </div>
                        <slot name="navbar-after-share-buttons" />
                    </div>
                </div>
            </nav>
        </div>
        <div class="grow main-panel">
            <div class="left">
                <SplitPanel direction={splitterDirection} bind:split={splitterSize}>
                    <div class="panel stack" slot="panelA">
                        <div class="top">
                            <Tabs
                                {files}
                                {currentIndex}
                                readonly={!canEditTabs}
                                {canToggleShowHidden}
                                bind:showHidden
                                on:selectTab={(e) => selectTab(e.detail.index)}
                                on:reorder={(e) =>
                                    reorder(e.detail.src, e.detail.dest)}
                                on:newFile={() => (newFileRequested = true)}
                                on:rename={rename}
                                on:close={(e) =>
                                    (deleteFileRequested = e.detail.index)}
                            />
                        </div>
                        <div class="grow">
                            {#if state}
                                <Editor {state} bind:this={editor} />
                            {/if}
                        </div>
                    </div>
                    <div class="panel" slot="panelB">
                        <Output
                            {output}
                            on:clear={() => (output = [])}
                            on:goto={(e) => gotoLocation(e.detail.location)}
                            bind:autoClearOutput
                            bind:orientation={splitterDirection}
                        />
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

    <NewFileModal
        active={newFileRequested}
        on:cancel={() => (newFileRequested = false)}
        on:new={(e) => newFile(e.detail.type)}
        on:open={(e) => openFiles(e.detail.files)}
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
            <button class="button" on:click={() => (deleteFileRequested = null)}
                >Cancel</button
            >
        </div>
    </Modal>

    <ModelModal
        active={needsModel}
        {modelFiles}
        selectedModelFile={modelModalModel}
        on:accept={(e) => getModelResolve(e.detail)}
        on:cancel={() => getModelResolve(false)}
    />

    <ParameterModal
        active={needsData}
        {dataFiles}
        selectedDataFiles={parameterModalDataFiles}
        dataTab={dataFileTab}
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
</div>

<style>
    .mzn-playground {
        height: 100%;
    }
    .stack {
        display: flex;
        flex-direction: column;
        height: 100%;
    }
    .stack > .grow {
        flex: 1 1 auto;
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
        flex: 1 1 auto;
    }
    .stack > .top {
        flex: 0 0 auto;
    }
    .panel {
        height: 100%;
    }
</style>
