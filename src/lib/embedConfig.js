export const EMBED_OPTIONS = [
    'theme',
    'showVersionSwitcher',
    'showSolverDropdown',
    'showShareButton',
    'showDownloadButton',
    'showExternalPlaygroundButton',
    'showTabs',
    'canEditTabs',
    'compilationEnabled',
    'canEditSolverSettings',
    'enabledSolvers',
    'canSwitchOrientation',
    'hideOutputOnStartup',
    'autoFocus',
    'splitterDirection',
    'splitterSize',
    'autoClearOutput',
    'showClearOutput',
    'showAutoClearOutput',
    'showOutputSectionToggles',
    'showOutputRightControls',
];

export const DEFAULT_EMBED_OPTIONS = {
    theme: 'auto',
    showVersionSwitcher: true,
    showSolverDropdown: true,
    showShareButton: true,
    showDownloadButton: true,
    showExternalPlaygroundButton: false,
    showTabs: true,
    canEditTabs: true,
    compilationEnabled: true,
    canEditSolverSettings: true,
    enabledSolvers: null,
    canSwitchOrientation: true,
    hideOutputOnStartup: true,
    autoFocus: true,
    splitterDirection: 'vertical',
    splitterSize: 75,
    autoClearOutput: false,
    showClearOutput: true,
    showAutoClearOutput: true,
    showOutputSectionToggles: true,
    showOutputRightControls: true,
};

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normaliseEmbedOptions(config) {
    if (!isObject(config)) {
        throw new Error('Embed configuration must be an object');
    }
    return Object.fromEntries(
        EMBED_OPTIONS.filter((key) => config[key] !== undefined).map((key) => [
            key,
            config[key],
        ]),
    );
}

export function normaliseProject(project) {
    if (!isObject(project)) {
        throw new Error('Embed project must be an object');
    }
    return {
        files: [],
        tab: 0,
        ...project,
        files: Array.isArray(project.files) ? project.files : [],
    };
}

export function parseEmbedConfig(hash) {
    if (!hash.startsWith('#embed=')) {
        return null;
    }
    const config = JSON.parse(decodeURIComponent(hash.substring(7)));
    if (!isObject(config)) {
        throw new Error('Embed configuration must be an object');
    }
    if (config.project !== undefined && config.url !== undefined) {
        throw new Error(
            'Embed configuration cannot specify both project and url',
        );
    }
    if (config.url !== undefined && typeof config.url !== 'string') {
        throw new Error('Embed url must be a string');
    }
    const options = normaliseEmbedOptions(config);
    return {
        options,
        project:
            config.project === undefined
                ? undefined
                : normaliseProject(config.project),
        url: config.url,
    };
}
