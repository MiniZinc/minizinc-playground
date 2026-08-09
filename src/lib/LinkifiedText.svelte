<script>
    /**
     * @typedef {Object} Props
     * @property {string} text
     */
    /** @type {Props} */
    let { text } = $props();

    /** @param {string} value */
    function linkify(value) {
        const parts = [];
        const urlPattern = /\b(?:https?:\/\/)[^\s<>"']+/gi;
        let lastIndex = 0;

        for (const match of value.matchAll(urlPattern)) {
            const start = match.index;
            let url = match[0].replace(/[.,!?;:]+$/, '');

            while (
                (url.endsWith(')') &&
                    (url.match(/\(/g) || []).length <
                        (url.match(/\)/g) || []).length) ||
                (url.endsWith(']') &&
                    (url.match(/\[/g) || []).length <
                        (url.match(/\]/g) || []).length) ||
                (url.endsWith('}') &&
                    (url.match(/\{/g) || []).length <
                        (url.match(/\}/g) || []).length)
            ) {
                url = url.slice(0, -1);
            }

            if (url.length === 0) {
                continue;
            }

            parts.push({ text: value.slice(lastIndex, start) });
            parts.push({
                text: url,
                href: url,
            });
            lastIndex = start + url.length;
        }

        parts.push({ text: value.slice(lastIndex) });
        return parts;
    }

    let parts = $derived(linkify(text));
</script>

{#each parts as part}
    {#if part.href}
        <a
            class="ext-link"
            href={part.href}
            target="_blank"
            rel="noopener noreferrer">{part.text}</a
        >
    {:else}
        {part.text}
    {/if}
{/each}

<style>
    .ext-link:hover {
        text-decoration: underline;
    }
</style>
