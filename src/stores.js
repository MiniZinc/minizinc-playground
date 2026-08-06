import { writable } from 'svelte/store';

const STORAGE_KEY = 'mznPlayground';
const MAX_SESSIONS = 5;

let ignoreChanges = false;
let initialised = false;

export const settings = writable({
    autoClearOutput: false,
    splitterDirection: 'vertical',
    splitterSize: 75,
    sessions: {},
});

export function initialiseSettings({ persistence = true } = {}) {
    if (initialised) return;
    initialised = true;
    if (!persistence) return;

    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings && savedSettings.length > 0) {
        ignoreChanges = true;
        try {
            settings.update((current) => ({
                ...current,
                ...JSON.parse(savedSettings),
            }));
        } catch (e) {
            console.error(e);
        }
        ignoreChanges = false;
    }

    settings.subscribe(($settings) => {
        if (ignoreChanges) return;
        if (Object.keys($settings.sessions).length > MAX_SESSIONS) {
            ignoreChanges = true;
            settings.update((current) => {
                const sessions = Object.entries(current.sessions)
                    .map(([key, value]) => ({ key, value }))
                    .sort((a, b) => b.value.timestamp - a.value.timestamp)
                    .slice(0, MAX_SESSIONS)
                    .reduce(
                        (result, { key, value }) => ({
                            ...result,
                            [key]: value,
                        }),
                        {},
                    );
                return { ...current, sessions };
            });
            ignoreChanges = false;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify($settings));
    });
    window.addEventListener('storage', (e) => {
        if (
            e.storageArea !== localStorage ||
            e.key !== STORAGE_KEY ||
            !e.newValue
        )
            return;
        ignoreChanges = true;
        try {
            settings.update((current) => ({
                ...current,
                ...JSON.parse(e.newValue),
            }));
        } catch (error) {
            console.error(error);
        }
        ignoreChanges = false;
    });
}
