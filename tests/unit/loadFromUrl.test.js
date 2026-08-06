import { afterEach, describe, expect, test, vi } from 'vitest';
import { loadFromUrl } from '../../src/lib/loadFromUrl.js';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('loadFromUrl', () => {
    test.each([
        'model.mzn',
        'config.mzc',
        'data.dzn',
        'data.json',
        'view.html',
        'view.js',
        'view.css',
    ])('loads supported %s files', async (filename) => {
        const fetch = vi.fn().mockResolvedValue({
            ok: true,
            text: () => Promise.resolve('contents'),
        });
        vi.stubGlobal('fetch', fetch);

        await expect(
            loadFromUrl(`https://example.test/${filename}`),
        ).resolves.toEqual({
            files: [{ name: filename, contents: 'contents' }],
            timestamp: expect.any(Number),
        });
    });

    test('rejects unsupported file extensions without fetching', async () => {
        const fetch = vi.fn();
        vi.stubGlobal('fetch', fetch);

        await expect(
            loadFromUrl('https://example.test/model.txt'),
        ).rejects.toThrow('File type not recognised');
        expect(fetch).not.toHaveBeenCalled();
    });

    test('loads a MiniZinc project and its visible files', async () => {
        const projectUrl = 'https://example.test/project/simple.mzp';
        const fetch = vi.fn((url) => {
            if (url.href === projectUrl) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            projectFiles: [
                                'model.mzn',
                                'data.dzn',
                                'ignored.txt',
                            ],
                            openFiles: ['model.mzn'],
                            openTab: 'model.mzn',
                            selectedBuiltinConfigId: 'org.gecode.gecode',
                        }),
                });
            }
            return Promise.resolve({
                ok: true,
                text: () =>
                    Promise.resolve(
                        url.pathname.endsWith('.mzn')
                            ? 'solve satisfy;'
                            : 'n = 1;',
                    ),
            });
        });
        vi.stubGlobal('fetch', fetch);

        await expect(loadFromUrl(projectUrl)).resolves.toEqual({
            files: [
                {
                    name: 'model.mzn',
                    contents: 'solve satisfy;',
                    hidden: false,
                },
                { name: 'data.dzn', contents: 'n = 1;', hidden: true },
            ],
            tab: 0,
            solverId: 'org.minizinc.gecode_presolver',
            timestamp: expect.any(Number),
        });
    });
});
