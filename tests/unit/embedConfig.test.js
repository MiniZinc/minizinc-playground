import { describe, expect, test } from 'vitest';
import { parseEmbedConfig } from '../../src/lib/embedConfig.js';

describe('parseEmbedConfig', () => {
    test('returns null for a normal playground hash', () => {
        expect(parseEmbedConfig('#code=solve')).toBeNull();
    });

    test('decodes supported options and applies project defaults', () => {
        const config = encodeURIComponent(
            JSON.stringify({
                theme: 'dark',
                showTabs: false,
                autoFocus: false,
                splitterDirection: 'horizontal',
                splitterSize: 60,
                autoClearOutput: true,
                showClearOutput: false,
                showAutoClearOutput: false,
                showOutputSectionToggles: false,
                showOutputRightControls: false,
                showExternalPlaygroundButton: true,
                unsupported: true,
                project: {
                    files: [{ name: 'model.mzn', contents: 'solve satisfy;' }],
                },
            }),
        );

        expect(parseEmbedConfig(`#embed=${config}`)).toEqual({
            options: {
                theme: 'dark',
                showTabs: false,
                autoFocus: false,
                splitterDirection: 'horizontal',
                splitterSize: 60,
                autoClearOutput: true,
                showClearOutput: false,
                showAutoClearOutput: false,
                showOutputSectionToggles: false,
                showOutputRightControls: false,
                showExternalPlaygroundButton: true,
            },
            project: {
                files: [{ name: 'model.mzn', contents: 'solve satisfy;' }],
                tab: 0,
            },
            url: undefined,
        });
    });

    test('accepts a remote project URL', () => {
        const config = encodeURIComponent(
            JSON.stringify({ url: 'https://example.test/model.mzn' }),
        );

        expect(parseEmbedConfig(`#embed=${config}`)).toMatchObject({
            url: 'https://example.test/model.mzn',
            project: undefined,
        });
    });

    test('rejects project and URL together', () => {
        const config = encodeURIComponent(
            JSON.stringify({
                project: {},
                url: 'https://example.test/model.mzn',
            }),
        );

        expect(() => parseEmbedConfig(`#embed=${config}`)).toThrow(
            'both project and url',
        );
    });
});
