<script>
    import Modal from './Modal.svelte';

    /**
     * @typedef {Object} Props
     * @property {boolean} [active]
     * @property {any} [projects]
     */

    /** @type {Props} */
    let { active = false, projects = [], onaccept, oncancel } = $props();

    let currentIndex = $state(-1);

    let valid = $derived(currentIndex >= 0 && currentIndex < projects.length);

    function init(active) {
        if (!active) {
            currentIndex = -1;
        }
    }
    $effect(() => {
        init(active);
    });

    function accept() {
        if (valid) {
            onaccept?.({ project: projects[currentIndex] });
        }
    }

    function projectFileNames(project, short = true) {
        if (short) {
            const names = project.files.slice(0, 3).map((f) => f.name);
            if (project.files.length > 3) {
                names.push(`+${project.files.length - 3} more…`);
            }
            return names.join(', ');
        }
        return project.files.map((f) => f.name).join(', ');
    }
</script>

<Modal {active} title="Open recent project" onsubmit={accept} {oncancel}>
    <div>
        {#each projects as project, i}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div
                class="item"
                class:has-background-primary={currentIndex === i}
                class:has-text-white={currentIndex === i}
                onclick={() => (currentIndex = i)}
                ondblclick={accept}
            >
                <div>
                    {projectFileNames(project)}
                </div>
                <div class="info is-size-7">
                    <div>
                        {project.solver}
                    </div>
                    <div>
                        {new Date(project.timestamp).toLocaleString()}
                    </div>
                </div>
            </div>
        {:else}
            <p class="has-text-centered">No recent projects.</p>
        {/each}
    </div>
    {#snippet footer()}
        <div>
            <button class="button is-primary" disabled={!valid}> Open </button>
            <button type="button" class="button" onclick={() => oncancel?.()}>
                Cancel
            </button>
        </div>
    {/snippet}
</Modal>

<style>
    .item {
        padding: 0.5rem;
        cursor: pointer;
        border-radius: 0.25rem;
        transition: all 0.2s ease;
    }
    .item:hover {
        background-color: #ffffff08;
    }
    .info {
        margin-top: 0.25rem;
        display: flex;
        justify-content: space-between;
    }
</style>
