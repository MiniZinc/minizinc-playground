import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

const baseConfig = viteConfig({ mode: 'test' });

export default mergeConfig(
    baseConfig,
    defineConfig({
        resolve: {
            conditions: ['browser'],
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
