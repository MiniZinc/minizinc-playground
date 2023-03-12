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

const BUILD_LIBRARY = /[yY1]/.test(process.env.EMBEDDED_PLAYGROUND || '');

// https://vitejs.dev/config/
export default defineConfig({
    build: BUILD_LIBRARY
        ? {
              lib: {
                  entry: 'src/embed.js',
                  name: 'MiniZincPlayground',
              },
              rollupOptions: {
                  external: ['svelte', /svelte\/.*/],
                  output: {
                    globals: (g) => g
                  }
              },
          }
        : undefined,
    base: process.env.BASE_PATH,
    plugins: [lezer(), svelte()],
});
