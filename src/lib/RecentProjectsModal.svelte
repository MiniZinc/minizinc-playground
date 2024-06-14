<script>
    import { createEventDispatcher } from 'svelte';
    import Modal from './Modal.svelte';
    const dispatch = createEventDispatcher();

    export let active = false;
    export let projects = [];

    let currentIndex = -1;

    $: valid = currentIndex >= 0 && currentIndex < projects.length;

    function init(active) {
        if (!active) {
            currentIndex = -1;
        }
    }
    $: init(active);

    function accept() {
        if (valid) {
            dispatch('accept', { project: projects[currentIndex] });
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

<Modal
    {active}
    title="Open recent project"
    on:submit={accept}
    on:cancel={() => dispatch('cancel')}
>
    <div>
        {#each projects as project, i}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="item"
                class:has-background-primary={currentIndex === i}
                class:has-text-white={currentIndex === i}
                on:click={() => (currentIndex = i)}
                on:dblclick={accept}
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
    <div slot="footer">
        <button class="button is-primary" disabled={!valid}> Open </button>
        <button
            type="button"
            class="button"
            on:click={() => dispatch('cancel')}
        >
            Cancel
        </button>
    </div>
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
