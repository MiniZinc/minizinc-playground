import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import viteConfig from './vite.config.js';

const baseConfig = viteConfig({ mode: 'test' });

export default mergeConfig(
    baseConfig,
    defineConfig({
        resolve: {
            conditions: ['browser'],
            alias: {
                'https://cdn.jsdelivr.net/npm/minizinc/dist/minizinc.mjs':
                    fileURLToPath(
                        new URL('./tests/mocks/minizinc.js', import.meta.url),
                    ),
                'https://cdn.jsdelivr.net/npm/minizinc@edge/dist/minizinc.mjs':
                    fileURLToPath(
                        new URL('./tests/mocks/minizinc.js', import.meta.url),
                    ),
            },
        },
        test: {
            projects: [
                {
                    extends: true,
                    test: {
                        name: 'unit',
                        environment: 'node',
                        include: ['tests/unit/**/*.test.js'],
                        exclude: ['dist/**', 'node_modules/**'],
                    },
                },
                {
                    extends: true,
                    test: {
                        name: 'components',
                        environment: 'jsdom',
                        include: ['tests/components/**/*.test.svelte.js'],
                        exclude: ['dist/**', 'node_modules/**'],
                        setupFiles: ['./tests/setup.js'],
                    },
                },
            ],
        },
    }),
);
