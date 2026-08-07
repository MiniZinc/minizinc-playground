<script>
    import { tick } from 'svelte';
    import Fa from 'svelte-fa';
    import { faEraser, faTrash } from '@fortawesome/free-solid-svg-icons';
    import ErrorOutput from './ErrorOutput.svelte';

    /**
     * @typedef {Object} Props
     * @property {any[]} output
     * @property {boolean} [autoClearOutput]
     * @property {boolean} [showClearOutput]
     * @property {boolean} [showAutoClearOutput]
     * @property {boolean} [showSectionToggles]
     * @property {boolean} [showRightControls]
     * @property {boolean} [isTab]
     * @property {import('svelte').Snippet<[]>} [beforeRightControls]
     * @property {() => void} [onclear]
     * @property {(payload: { location: any }) => void} [ongoto]
     */
    /** @type {Props} */
    let {
        output,
        autoClearOutput = $bindable(false),
        showClearOutput = true,
        showAutoClearOutput = true,
        showSectionToggles = true,
        showRightControls = true,
        isTab = false,
        beforeRightControls,
        onclear,
        ongoto,
    } = $props();

    let outputElement = $state();
    let showStatistics = $state(true);
    let showStderr = $state(true);
    let showTiming = $state(true);
    let showWarnings = $state(true);
    let showErrors = $state(true);

    let hasStatistics = $derived(
        output.some((run) => run.output.some((m) => m.type === 'statistics')),
    );
    let hasStderr = $derived(
        output.some((run) => run.output.some((m) => m.type === 'stderr')),
    );
    let hasTiming = $derived(
        output.some((run) => run.output.some((m) => m.type === 'time')),
    );
    let hasWarnings = $derived(
        output.some((run) =>
            run.output.some(
                (m) =>
                    m.type === 'warning' ||
                    (m.type === 'checker' &&
                        m.messages &&
                        m.messages.some((m) => m.type === 'warning')),
            ),
        ),
    );
    let hasErrors = $derived(
        output.some((run) =>
            run.output.some(
                (m) =>
                    m.type === 'error' ||
                    (m.type === 'checker' &&
                        m.messages &&
                        m.messages.some((m) => m.type === 'error')),
            ),
        ),
    );

    /** @param {any[]} output @returns {string[]} */
    function getUserSections(output) {
        const messages = output.flatMap((run) => run.output);
        const sections = new Set(
            [
                ...messages
                    .filter(
                        (m) => m.type === 'solution' || m.type === 'checker',
                    )
                    .flatMap((m) =>
                        m.sections.filter((s) => m.output[s].length > 0),
                    ),
                ...messages
                    .filter((m) => m.type === 'trace')
                    .map((m) => m.section),
            ].filter((s) => s !== 'raw' && !s.startsWith('mzn_vis_')),
        );
        const result = [...sections.values()];
        result.sort();
        return result;
    }

    /** @param {string} section */
    function toggleSection(section) {
        if (hiddenSections.indexOf(section) === -1) {
            hiddenSections = [...hiddenSections, section];
        } else {
            hiddenSections = hiddenSections.filter((s) => s !== section);
        }
    }

    function toggleAllSections() {
        if (hiddenSections.length === 0) {
            hiddenSections = [...userSections];
        } else {
            hiddenSections = [];
        }
    }

    let userSections = $derived(getUserSections(output));
    let hiddenSections = $state([]);

    $effect(() => {
        const visibleSections = new Set(userSections);
        const nextHiddenSections = hiddenSections.filter((section) =>
            visibleSections.has(section),
        );
        if (nextHiddenSections.length !== hiddenSections.length) {
            hiddenSections = nextHiddenSections;
        }
    });

    $effect(() => update(output));

    const statusMap = {
        ALL_SOLUTIONS: '==========',
        OPTIMAL_SOLUTION: '==========',
        UNSATISFIABLE: '=====UNSATISFIABLE=====',
        UNSAT_OR_UNBOUNDED: '=====UNSATorUNBOUNDED=====',
        UNBOUNDED: '=====UNBOUNDED=====',
        UNKNOWN: '=====UNKNOWN=====',
        ERROR: '=====ERROR=====',
    };

    /** @param {any[]} o */
    async function update(o) {
        if (!outputElement) {
            return;
        }
        await tick();
        outputElement.scrollTo(0, outputElement.scrollHeight);
    }

    /** @param {number} time */
    function formatRuntime(time) {
        const hours = Math.floor(time / 3600000);
        const minutes = Math.floor((time % 3600000) / 60000);
        const seconds = Math.floor((time % 60000) / 1000);
        const msec = Math.floor(time % 1000);
        let elapsed = '';
        if (hours > 0) {
            elapsed += `${hours}h `;
        }
        if (hours > 0 || minutes > 0) {
            elapsed += `${minutes}m `;
        }
        if (hours > 0 || minutes > 0 || seconds > 0) {
            elapsed += `${seconds}s `;
        }
        if (hours == 0 && minutes == 0) {
            if (seconds > 0) {
                elapsed += ' ';
            }
            elapsed += `${msec}msec`;
        }
        return elapsed.trimEnd();
    }

    /** @param {any} msg @param {string[]} hiddenSections */
    function processCheckerMessage(msg, hiddenSections) {
        const parts = [];
        let buffer = [];
        const flush = () => {
            if (buffer.length > 0) {
                const split = buffer.join('').split('\n');
                if (split[split.length - 1] === '') {
                    split.splice(split.length - 1, 1);
                }
                parts.push({
                    type: 'text',
                    message: split.map((x) => `% ${x}`).join('\n'),
                });
                buffer = [];
            }
        };
        if (msg.messages) {
            for (const message of msg.messages) {
                if (message.type === 'solution') {
                    for (const section of message.sections) {
                        if (
                            hiddenSections.indexOf(section) === -1 &&
                            section !== 'raw'
                        ) {
                            buffer.push(msg.output[section]);
                        }
                    }
                } else if (message.type === 'trace') {
                    if (
                        hiddenSections.indexOf(message.section) === -1 &&
                        message.section !== 'raw'
                    ) {
                        buffer.push(message.message);
                    }
                } else {
                    flush();
                    parts.push(message);
                }
            }
            flush();
        } else {
            for (const section of msg.sections) {
                if (
                    hiddenSections.indexOf(section) === -1 &&
                    section !== 'raw'
                ) {
                    buffer.push(msg.output[section]);
                }
            }
            flush();
        }
        return parts;
    }
</script>

<div class="stack output-window">
    <div
        class="top"
        class:is-empty={!showSectionToggles && !showRightControls}
        class:is-tab={isTab}
    >
        {#if showSectionToggles}
            <button
                class="button is-small section-toggle"
                onclick={() => toggleAllSections()}
                disabled={userSections.length === 0}
            >
                {#if hiddenSections.length === 0}
                    Hide all
                {:else}
                    Show all
                {/if}
            </button>
            {#each userSections as section}
                <button
                    class="button is-small section-toggle"
                    class:is-primary={hiddenSections.indexOf(section) === -1}
                    class:is-light={hiddenSections.indexOf(section) !== -1}
                    title={`Click to ${
                        hiddenSections.indexOf(section) === -1 ? 'hide' : 'show'
                    } ${section} output`}
                    onclick={() => toggleSection(section)}
                >
                    {section}
                </button>
            {/each}
            <div class="spacer"></div>
            {#if hasStatistics}
                <button
                    class="button is-small section-toggle"
                    class:is-primary={showStatistics}
                    class:is-light={!showStatistics}
                    title={`Click to ${
                        showStatistics ? 'hide' : 'show'
                    } statistics information`}
                    onclick={() => (showStatistics = !showStatistics)}
                >
                    Statistics
                </button>
            {/if}
            {#if hasStderr}
                <button
                    class="button is-small section-toggle"
                    class:is-primary={showStderr}
                    class:is-light={!showStderr}
                    title={`Click to ${
                        showStderr ? 'hide' : 'show'
                    } standard error output`}
                    onclick={() => (showStderr = !showStderr)}
                >
                    Standard error
                </button>
            {/if}
            {#if hasTiming}
                <button
                    class="button is-small section-toggle"
                    class:is-primary={showTiming}
                    class:is-light={!showTiming}
                    title={`Click to ${
                        showTiming ? 'hide' : 'show'
                    } timing information`}
                    onclick={() => (showTiming = !showTiming)}
                >
                    Timing
                </button>
            {/if}
            {#if hasWarnings}
                <button
                    class="button is-small section-toggle"
                    class:is-primary={showWarnings}
                    class:is-light={!showWarnings}
                    title={`Click to ${showTiming ? 'hide' : 'show'} warnings`}
                    onclick={() => (showWarnings = !showWarnings)}
                >
                    Warnings
                </button>
            {/if}
            {#if hasErrors}
                <button
                    class="button is-small section-toggle"
                    class:is-primary={showErrors}
                    class:is-light={!showErrors}
                    title={`Click to ${showTiming ? 'hide' : 'show'} errors`}
                    onclick={() => (showErrors = !showErrors)}
                >
                    Errors
                </button>
            {/if}
        {/if}
        {#if showRightControls}
            <div class="field has-addons">
                {@render beforeRightControls?.()}

                {#if showAutoClearOutput}
                    <p class="control">
                        <button
                            class="button is-small"
                            class:is-primary={autoClearOutput}
                            class:is-light={!autoClearOutput}
                            title="Clear output on each run"
                            onclick={() => (autoClearOutput = !autoClearOutput)}
                        >
                            <span class="icon"><Fa icon={faEraser} /></span>
                        </button>
                    </p>
                {/if}

                {#if showClearOutput}
                    <p class="control">
                        <button
                            class="button is-small is-danger"
                            title="Clear output"
                            onclick={() => onclear?.()}
                        >
                            <span class="icon"><Fa icon={faTrash} /></span>
                        </button>
                    </p>
                {/if}
            </div>
        {/if}
    </div>
    <div class="grow">
        <div bind:this={outputElement} class="output-window-contents">
            {#each output as run}
                <details open>
                    <summary>
                        {#if run.isCompile}
                            Compiling
                        {:else}
                            Running
                        {/if}
                        {run.files.join(', ')}
                    </summary>
                    <div class="messages">
                        {#each run.output as msg}
                            {#if msg.type === 'solution'}
                                {#each msg.sections as section}
                                    {#if hiddenSections.indexOf(section) === -1 && !section.startsWith('mzn_vis_')}
                                        {#if typeof msg.output[section] !== 'string'}
                                            <pre>{JSON.stringify(
                                                    msg.output[section],
                                                    null,
                                                    2,
                                                )}</pre>
                                            <br />
                                        {:else if section !== 'raw'}
                                            <pre>{msg.output[section]}</pre>
                                        {/if}
                                    {/if}
                                {/each}
                                <pre>----------</pre>
                                <br />
                            {:else if msg.type === 'checker'}
                                <span class="mzn-checker">
                                    <pre>% Solution checker report:</pre>
                                    <br />
                                    {#each processCheckerMessage(msg, hiddenSections) as part}
                                        {#if part.type === 'text'}
                                            <pre>{part.message}</pre>
                                        {:else if part.type === 'error' || part.type === 'warning'}
                                            {#if (part.type === 'error' && showErrors) || (part.type === 'warning' && showWarnings)}
                                                <ErrorOutput
                                                    msg={part}
                                                    {ongoto}
                                                />
                                            {/if}
                                        {/if}
                                    {/each}
                                </span>
                            {:else if msg.type === 'time'}
                                {#if showTiming}
                                    <pre
                                        class="mzn-time">% time elapsed: {formatRuntime(
                                            msg.time,
                                        )}</pre>
                                    <br />
                                {/if}
                            {:else if msg.type === 'trace'}
                                {#if hiddenSections.indexOf(msg.section) === -1 && !msg.section.startsWith('mzn_vis_')}
                                    {#if typeof msg.message !== 'string'}
                                        <pre>{JSON.stringify(
                                                msg.message,
                                                null,
                                                2,
                                            )}</pre>
                                        <br />
                                    {:else}
                                        <pre
                                            class="mzn-trace">{msg.message}</pre>
                                    {/if}
                                {/if}
                            {:else if msg.type === 'comment'}
                                <pre class="mzn-comment">{msg.comment}</pre>
                            {:else if msg.type === 'stderr'}
                                {#if showStderr}
                                    <pre class="mzn-stderr">{msg.value}</pre>
                                {/if}
                            {:else if msg.type === 'statistics'}
                                {#if showStatistics}
                                    {#each Object.keys(msg.statistics) as stat}
                                        <pre><span class="mzn-stat"
                                                >%%%mzn-stat:</span
                                            > {stat}={msg.statistics[
                                                stat
                                            ]}</pre>
                                        <br />
                                    {/each}
                                    <pre><span class="mzn-stat"
                                            >%%%mzn-stat-end</span
                                        ></pre>
                                    <br />
                                {/if}
                            {:else if msg.type === 'cancel'}
                                <pre class="mzn-runtime">Stopped.</pre>
                                <br />
                            {:else if msg.type === 'status'}
                                <pre>{statusMap[msg.status]}</pre>
                                <br />
                            {:else if msg.type === 'error' || msg.type === 'warning'}
                                {#if (msg.type === 'error' && showErrors) || (msg.type === 'warning' && showWarnings)}
                                    <ErrorOutput {msg} {ongoto} />
                                {/if}
                            {:else if msg.type === 'exit'}
                                {#if msg.code}
                                    <pre
                                        class="mzn-error">Process finished with non-zero exit code {msg.code}.</pre>
                                    <br />
                                {/if}
                                <pre
                                    class="mzn-runtime">Finished in {formatRuntime(
                                        msg.runTime,
                                    )}.</pre>
                            {/if}
                        {/each}
                    </div>
                </details>
            {/each}
        </div>
    </div>
</div>

<style>
    .stack {
        display: flex;
        flex-direction: column;
        height: 100%;
    }
    .stack > .grow {
        flex: 1 1 0;
        overflow: hidden;
    }

    .stack > .top {
        flex: 0 0 auto;
        display: flex;
        padding: 0.5rem;
        border-bottom: solid 1px var(--bulma-border);
    }

    .stack > .top.is-empty {
        padding: 0;
    }

    .stack > .top.is-empty.is-tab {
        border-bottom: 0;
    }

    .top > .field {
        margin-bottom: 0;
    }

    .grow {
        background-color: var(--bulma-scheme-main-bis);
    }

    .spacer {
        flex: 1 1 auto;
    }

    .section-toggle {
        margin-right: 0.5rem;
    }

    .output-window {
        height: 100%;
        overflow: auto;
    }

    .output-window-contents {
        height: 100%;
        overflow: auto;
        padding: 1rem;
    }

    details {
        margin-bottom: 0.5rem;
    }

    .messages {
        padding-left: 0.5rem;
        line-height: 1.25;
    }

    .mzn-checker {
        display: block;
    }
</style>
