<script>
    import Fa from 'svelte-fa';
    import { faClipboard } from '@fortawesome/free-solid-svg-icons';
    import Modal from './Modal.svelte';
    import { DEFAULT_EMBED_OPTIONS, EMBED_OPTIONS } from './embedConfig.js';

    /**
     * @typedef {Object} Props
     * @property {boolean} [active]
     * @property {string} shareUrl
     * @property {any} project
     * @property {() => void} [oncancel]
     */
    /** @type {Props} */
    let { active = false, shareUrl, project, oncancel } = $props();

    let activeTab = $state('link');
    let copied = $state(false);
    let linkInput = $state();
    let embedOptionsText = $state('');
    let initializedUrl = $state(null);

    $effect(() => {
        if (!active) {
            initializedUrl = null;
        } else if (shareUrl && shareUrl !== initializedUrl) {
            activeTab = 'link';
            copied = false;
            embedOptionsText = JSON.stringify(DEFAULT_EMBED_OPTIONS, null, 2);
            initializedUrl = shareUrl;
        }
    });

    let embedOptions = $derived.by(() => {
        try {
            const value = JSON.parse(embedOptionsText);
            if (
                value === null ||
                typeof value !== 'object' ||
                Array.isArray(value)
            ) {
                return {
                    value: null,
                    error: 'The embed options must be a JSON object.',
                };
            }
            const invalidKey = Object.keys(value).find(
                (key) => !EMBED_OPTIONS.includes(key),
            );
            if (invalidKey) {
                return {
                    value: null,
                    error: `Unknown embed option: ${invalidKey}`,
                };
            }
            return { value, error: null };
        } catch (error) {
            return { value: null, error: error.message };
        }
    });
    let embedConfig = $derived.by(() => {
        if (!embedOptions.value) return null;
        const options = Object.fromEntries(
            Object.entries(embedOptions.value).filter(
                ([key, value]) =>
                    JSON.stringify(value) !==
                    JSON.stringify(DEFAULT_EMBED_OPTIONS[key]),
            ),
        );
        return { project, ...options };
    });
    let embedUrl = $derived.by(() => {
        if (!embedConfig) {
            return null;
        }
        const url = new URL(shareUrl);
        url.hash = `#embed=${encodeURIComponent(JSON.stringify(embedConfig))}`;
        return url.toString();
    });
    let iframeCode = $derived(
        embedUrl
            ? `<iframe\n    src="${embedUrl}"\n    title="MiniZinc Playground"\n    width="100%"\n    height="700"\n    allow="clipboard-write"\n></iframe>`
            : '',
    );

    /** @param {string} value @param {HTMLInputElement | HTMLTextAreaElement} [input] */
    function copy(value, input) {
        if (input) input.select();
        navigator.clipboard.writeText(value);
        copied = true;
    }

    function close() {
        oncancel?.();
    }
</script>

<Modal {active} title="Share this project" oncancel={close}>
    <div class="tabs">
        <ul>
            <li class:is-active={activeTab === 'link'}>
                <a
                    href="#link"
                    onclick={(event) => {
                        event.preventDefault();
                        activeTab = 'link';
                        copied = false;
                    }}>Link</a
                >
            </li>
            <li class:is-active={activeTab === 'embed'}>
                <a
                    href="#embed"
                    onclick={(event) => {
                        event.preventDefault();
                        activeTab = 'embed';
                        copied = false;
                    }}>Embed</a
                >
            </li>
        </ul>
    </div>

    {#if activeTab === 'link'}
        <div class="field has-addons">
            <p class="control is-expanded">
                <input
                    bind:this={linkInput}
                    class="input"
                    type="text"
                    value={shareUrl}
                    onclick={() => linkInput.select()}
                    readonly
                />
            </p>
            <p class="control">
                <button
                    type="button"
                    class="button"
                    class:is-primary={!copied}
                    class:is-success={copied}
                    aria-label="Copy sharing URL"
                    onclick={() => copy(shareUrl, linkInput)}
                >
                    <span class="icon"><Fa icon={faClipboard} /></span>
                </button>
            </p>
        </div>
    {:else}
        <details class="advanced-options-details">
            <summary>Advanced options</summary>
            <div class="field advanced-options">
                <label class="label" for="embed-options"
                    >Embed options (JSON)</label
                >
                <div class="control">
                    <textarea
                        id="embed-options"
                        class="textarea config-editor"
                        bind:value={embedOptionsText}
                        rows="8"
                        spellcheck="false"></textarea>
                </div>
                {#if embedOptions.error}
                    <p class="help is-danger">
                        Invalid embed options: {embedOptions.error}
                    </p>
                {/if}
            </div>
        </details>

        <div class="field">
            <label class="label" for="iframe-code">Iframe code</label>
            <div class="control">
                <textarea
                    id="iframe-code"
                    class="textarea iframe-code"
                    value={iframeCode}
                    rows="7"
                    readonly
                    onclick={(event) => event.currentTarget.select()}
                ></textarea>
            </div>
        </div>
        <button
            type="button"
            class="button"
            aria-label="Copy iframe code"
            class:is-primary={!copied}
            class:is-success={copied}
            disabled={!iframeCode}
            onclick={() => copy(iframeCode)}
        >
            <span class="icon"><Fa icon={faClipboard} /></span>
            <span>{copied ? 'Copied' : 'Copy to clipboard'}</span>
        </button>
    {/if}

    {#snippet footer()}
        <div>
            <button class="button is-primary" onclick={close}>Done</button>
        </div>
    {/snippet}
</Modal>

<style>
    .advanced-options-details {
        margin-bottom: 1rem;
    }
    .advanced-options {
        margin-top: 1rem;
    }
    .config-editor,
    .iframe-code {
        font-family: monospace;
        font-size: 0.9em;
    }
    .iframe-code {
        min-height: 10rem;
    }
</style>
