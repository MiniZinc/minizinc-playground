import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { buildParserFile } from '@lezer/generator';
import path from 'path';
import fs from 'fs';

function lezer() {
    const cache = {};
    return {
        name: 'vite-plugin-lezer',
        enforce: 'pre',
        resolveId(source, importer) {
            if (!source.endsWith('.grammar')) {
                return null;
            }
            return path.join(path.dirname(importer), source);
        },

        async load(id) {
            if (!id.endsWith('.grammar')) {
                return null;
            }
            this.addWatchFile(id);
            if (!cache[id]) {
                cache[id] = (async () => {
                    const code = await fs.promises.readFile(id, 'utf8');
                    return buildParserFile(code, {
                        fileName: id,
                        moduleStyle: 'es',
                        warn: (message) => this.warn(message),
                    });
                })();
            }
            const result = await cache[id];
            return result.parser;
        },

        watchChange(id) {
            if (cache[id]) {
                cache[id] = null;
            }
        },
    };
}

const libraryBuild = {
    lib: { entry: 'src/embed.js', name: 'MiniZincPlayground' },
    rollupOptions: { output: { globals: (g) => g } },
};

const buildConfigs = {
    library: libraryBuild,
    'library-external-svelte': {
        lib: { ...libraryBuild.lib },
        rollupOptions: {
            ...libraryBuild.rollupOptions,
            external: ['svelte', /svelte\/.*/],
        },
        outDir: 'dist/external-svelte',
    },
};

const svelteLibOptions = {
    compilerOptions: { compatibility: { componentApi: 4 } },
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    build: buildConfigs[mode],
    base: process.env.BASE_PATH,
    plugins: [
        lezer(),
        svelte({ ...(mode in buildConfigs ? svelteLibOptions : {}) }),
    ],
}));
