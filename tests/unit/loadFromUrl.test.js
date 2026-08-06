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

    test('reports an HTTP error without reading the response body', async () => {
        const fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            statusText: 'Not Found',
        });
        vi.stubGlobal('fetch', fetch);

        await expect(
            loadFromUrl('https://example.test/missing.mzn'),
        ).rejects.toThrow('Request failed (404 Not Found)');
    });

    test('reports an HTTP error for a project file', async () => {
        const projectUrl = 'https://example.test/project.mzp';
        const fetch = vi.fn((url) => {
            if (url.href === projectUrl) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            projectFiles: ['model.mzn'],
                            openFiles: ['model.mzn'],
                            openTab: 'model.mzn',
                        }),
                });
            }
            return Promise.resolve({
                ok: false,
                status: 503,
                statusText: 'Unavailable',
            });
        });
        vi.stubGlobal('fetch', fetch);

        await expect(loadFromUrl(projectUrl)).rejects.toThrow(
            'Request failed (503 Unavailable)',
        );
    });

    test('resolves project files relative to a project URL with a query', async () => {
        const projectUrl = 'https://example.test/projects/project.mzp?v=1';
        const fetchedUrls = [];
        const fetch = vi.fn((url) => {
            fetchedUrls.push(url.href);
            if (url.href === projectUrl) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            projectFiles: ['model.mzn'],
                            openFiles: ['model.mzn'],
                            openTab: 'model.mzn',
                        }),
                });
            }
            return Promise.resolve({
                ok: true,
                text: () => Promise.resolve('solve satisfy;'),
            });
        });
        vi.stubGlobal('fetch', fetch);

        await loadFromUrl(projectUrl);

        expect(fetchedUrls).toEqual([
            projectUrl,
            'https://example.test/projects/model.mzn',
        ]);
    });
});
