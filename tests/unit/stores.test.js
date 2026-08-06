import { beforeEach, describe, expect, test, vi } from 'vitest';

const STORAGE_KEY = 'mznPlayground';

beforeEach(() => {
    const storage = new Map();
    globalThis.localStorage = {
        clear: () => storage.clear(),
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, String(value)),
        removeItem: (key) => storage.delete(key),
    };
    globalThis.window = {
        addEventListener: vi.fn(),
    };
    vi.resetModules();
});

async function loadStore() {
    return import('../../src/stores.js');
}

describe('settings store', () => {
    test('loads saved settings and merges them with defaults', async () => {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                splitterSize: 50,
                sessions: { one: { timestamp: 1 } },
            }),
        );
        const { initialiseSettings, settings } = await loadStore();

        initialiseSettings();
        let value;
        const unsubscribe = settings.subscribe((next) => (value = next));

        expect(value).toMatchObject({
            autoClearOutput: false,
            splitterDirection: 'vertical',
            splitterSize: 50,
            sessions: { one: { timestamp: 1 } },
        });
        unsubscribe();
    });

    test('ignores malformed saved settings', async () => {
        localStorage.setItem(STORAGE_KEY, '{bad json');
        const { initialiseSettings, settings } = await loadStore();
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        initialiseSettings();
        let value;
        const unsubscribe = settings.subscribe((next) => (value = next));

        expect(value.splitterSize).toBe(75);
        expect(error).toHaveBeenCalled();
        unsubscribe();
        error.mockRestore();
    });

    test('keeps only the five newest sessions', async () => {
        const { initialiseSettings, settings } = await loadStore();
        initialiseSettings();
        settings.update((current) => ({
            ...current,
            sessions: Object.fromEntries(
                Array.from({ length: 6 }, (_, i) => [
                    `session-${i}`,
                    { timestamp: i },
                ]),
            ),
        }));

        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        expect(Object.keys(saved.sessions)).toEqual([
            'session-5',
            'session-4',
            'session-3',
            'session-2',
            'session-1',
        ]);
    });

    test('does not persist when persistence is disabled', async () => {
        const { initialiseSettings, settings } = await loadStore();
        initialiseSettings({ persistence: false });
        settings.update((current) => ({ ...current, splitterSize: 20 }));

        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
});
