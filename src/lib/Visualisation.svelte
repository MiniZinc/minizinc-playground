<script context="module">
    import connector from '../vis/connector?raw';

    const connectorURL = URL.createObjectURL(
        new Blob([connector], {
            type: 'text/html; charset=utf-8',
        })
    );
</script>

<script>
    import Fa from 'svelte-fa';
    import { faForwardFast } from '@fortawesome/free-solid-svg-icons';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    export let files = [];

    let prevFollowLatest = true;
    let followLatest = true;
    let prevSolution = 0;
    let currentSolution = 0;
    let numSolutions = 0;

    let visualisations = [];
    let finalStatus = null;
    let finishTime = null;

    $: columns = Math.ceil(Math.sqrt(visualisations.length));

    export function reset() {
        for (const vis of visualisations) {
            URL.revokeObjectURL(vis.url);
            for (const url of vis.extraUrls) {
                URL.revokeObjectURL(url);
            }
        }
        prevFollowLatest = true;
        followLatest = true;
        prevSolution = 0;
        currentSolution = 0;
        numSolutions = 0;
        visualisations = [];
        finalStatus = null;
        finishTime = null;
    }

    export function addVisualisation(key, html, userData) {
        let makeReady;
        const ready = new Promise((res, rej) => {
            makeReady = res;
        });
        ready.then((target) => {
            target.contentWindow.postMessage(
                { event: 'init', payload: userData },
                '*'
            );
        });
        const projectFiles = files.reduce(
            (acc, x) => ({ ...acc, [x.name]: x.state.doc.toString() }),
            {}
        );
        const extraUrls = [];
        const doc = new DOMParser().parseFromString(html, 'text/html');
        for (const script of doc.getElementsByTagName('script')) {
            const src = script.getAttribute('src');
            if (src === '/minizinc-ide.js') {
                script.src = connectorURL;
            } else if (src in projectFiles && src.endsWith('.js')) {
                const url = URL.createObjectURL(
                    new Blob([projectFiles[src]], {
                        type: 'text/javascript; charset=utf-8',
                    })
                );
                script.src = url;
                extraUrls.push(url);
            }
        }
        for (const link of doc.getElementsByTagName('link')) {
            const href = link.getAttribute('href');
            if (href in projectFiles && href.endsWith('.css')) {
                const url = URL.createObjectURL(
                    new Blob([projectFiles[href]], {
                        type: 'text/css; charset=utf-8',
                    })
                );
                link.href = url;
                extraUrls.push(url);
            }
        }

        const contents =
            new XMLSerializer().serializeToString(doc.doctype) +
            doc.documentElement.outerHTML;
        const url = URL.createObjectURL(
            new Blob([contents], {
                type: 'text/html; charset=utf-8',
            })
        );
        visualisations = [
            ...visualisations,
            {
                key,
                url,
                extraUrls,
                makeReady,
                ready,
                solutions: [],
                element: null,
            },
        ];
    }

    export function addSolution(solution, time) {
        for (const key in solution) {
            const vis = visualisations.find((x) => x.key === key);
            if (!vis) {
                console.error(`Did not find visualisation for ${key}`);
                continue;
            }
            const payload = {
                time,
                data: solution[key],
            };
            vis.solutions.push(payload);
            sendMessage({ event: 'solution', payload }, vis);
        }
        numSolutions++;
    }

    export function status(status, time) {
        finalStatus = { status, time };
        for (let i = 0; i < visualisations.length; i++) {
            sendMessage(
                { event: 'status', payload: finalStatus },
                visualisations[i]
            );
        }
    }

    export function finish(time) {
        finishTime = time;
        for (let i = 0; i < visualisations.length; i++) {
            sendMessage(
                { event: 'finish', payload: finishTime },
                visualisations[i]
            );
        }
    }

    function onMessage(e) {
        const message = e.data;
        const vis = visualisations.find(
            (v) => v.element.contentWindow === e.source
        );
        switch (message.event) {
            case 'rebroadcast':
                // Rebroadcast to all children
                for (const vis of visualisations) {
                    sendMessage(message.message, vis);
                }
                if (message.message.event === 'goToSolution') {
                    prevFollowLatest = message.message.payload === -1;
                    followLatest = message.message.payload === -1;
                    prevSolution = message.message.payload + 1;
                    currentSolution = message.message.payload + 1;
                }
                break;
            case 'solve':
                dispatch('solve', {
                    modelFile: message.modelFile,
                    dataFiles: message.dataFiles,
                    options: message.options,
                });
                break;
            case 'getNumSolutions':
                sendMessage(
                    {
                        event: 'response',
                        id: message.id,
                        payload: vis.solutions.length,
                    },
                    vis
                );
                break;
            case 'getSolution':
                const idx =
                    message.index < 0
                        ? message.index + vis.solutions.length
                        : message.index;
                if (idx < 0 || idx >= vis.solutions.length) {
                    sendMessage(
                        {
                            event: 'error',
                            id: message.id,
                            message: 'Solution index out of range',
                        },
                        vis
                    );
                } else {
                    sendMessage(
                        {
                            event: 'response',
                            id: message.id,
                            payload:
                                vis.solutions[
                                    message.index === -1
                                        ? vis.solutions.length - 1
                                        : message.index
                                ],
                        },
                        vis
                    );
                    break;
                }
            case 'getAllSolutions':
                sendMessage(
                    {
                        event: 'response',
                        id: message.id,
                        payload: vis.solutions,
                    },
                    vis
                );
                break;
            case 'getStatus':
                sendMessage(
                    {
                        event: 'response',
                        id: message.id,
                        payload: finalStatus,
                    },
                    vis
                );
                break;
            case 'getFinishTime':
                sendMessage(
                    {
                        event: 'response',
                        id: message.id,
                        payload: finishTime,
                    },
                    vis
                );
                break;
        }
    }

    async function sendMessage(message, vis) {
        await vis.ready;
        vis.element.contentWindow.postMessage(message, '*');
    }

    $: updateControls(currentSolution, followLatest, numSolutions);

    function updateControls(c, f, n) {
        if (followLatest && prevSolution === currentSolution) {
            prevSolution = numSolutions;
            currentSolution = numSolutions;
        }

        if (followLatest !== prevFollowLatest) {
            prevFollowLatest = followLatest;
            for (const vis of visualisations) {
                sendMessage(
                    {
                        event: 'goToSolution',
                        payload: followLatest ? -1 : currentSolution - 1,
                    },
                    vis
                );
            }
        }

        if (prevSolution !== currentSolution) {
            prevSolution = currentSolution;
            prevFollowLatest = false;
            followLatest = false;
            for (const vis of visualisations) {
                sendMessage(
                    {
                        event: 'goToSolution',
                        payload: currentSolution - 1,
                    },
                    vis
                );
            }
        }
    }
</script>

<svelte:window on:message={onMessage} />

<div class="stack">
    {#if numSolutions > 0}
        <div class="top">
            <div class="solution-label"><span>Solution:</span></div>
            <div>
                <input
                    class="input is-small"
                    type="number"
                    min={numSolutions > 0 ? 1 : 0}
                    max={numSolutions}
                    bind:value={currentSolution}
                />
            </div>
            <div class="solution-slider">
                <input
                    type="range"
                    bind:value={currentSolution}
                    min={numSolutions > 0 ? 1 : 0}
                    max={numSolutions}
                />
            </div>
            <div class="field has-addons">
                <p class="control">
                    <button
                        class="button is-small"
                        class:is-primary={followLatest}
                        class:is-light={!followLatest}
                        title="Follow latest solution"
                        on:click={() => (followLatest = !followLatest)}
                    >
                        <span class="icon"><Fa icon={faForwardFast} /></span>
                    </button>
                </p>
            </div>
        </div>
    {/if}
    <div class="grow">
        <div
            class="vis-grid"
            style:grid-template-columns={`repeat(${columns}, auto)`}
        >
            {#each visualisations as vis}
                <iframe
                    class="vis-window"
                    src={vis.url}
                    title="Visualisation"
                    bind:this={vis.element}
                    on:load={(e) => vis.makeReady(e.target)}
                ></iframe>
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

    .top > .field {
        margin-bottom: 0;
    }

    .vis-grid {
        width: 100%;
        height: 100%;
        display: grid;
        grid-auto-rows: auto;
        gap: 1px;
        background: var(--bulma-border);
    }

    .vis-window {
        background: #fff;
        border: 0;
        width: 100%;
        height: 100%;
    }

    .solution-slider {
        flex: 1 1 auto;
        padding: 0 1rem;
        display: flex;
        align-items: center;
    }

    .solution-label {
        display: flex;
        align-items: center;
        padding-right: 1rem;
    }

    .solution-slider > input {
        width: 100%;
    }
</style>
