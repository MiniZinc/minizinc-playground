import { writable } from 'svelte/store';

const STORAGE_KEY = 'mznPlayground';
const MAX_SESSIONS = 5;

let ignoreChanges = false;
export const settings = writable(
    {
        autoClearOutput: false,
        splitterDirection: 'vertical',
        splitterSize: 75,
        sessions: {},
    },
    (_set, update) => {
        const savedSettings = localStorage.getItem(STORAGE_KEY);
        if (savedSettings && savedSettings.length > 0) {
            ignoreChanges = true;
            try {
                update(($settings) => ({
                    ...$settings,
                    ...JSON.parse(savedSettings),
                }));
            } catch (e) {
                console.error(e);
            }
            ignoreChanges = false;
        }
        window.addEventListener('storage', (e) => {
            if (
                e.storageArea === localStorage &&
                e.key === STORAGE_KEY &&
                e.newValue.length > 0
            ) {
                ignoreChanges = true;
                try {
                    update(($settings) => ({
                        ...$settings,
                        ...JSON.parse(e.newValue),
                    }));
                } catch (e) {
                    console.error(e);
                }
                ignoreChanges = false;
            }
        });
    },
);
settings.subscribe(($settings) => {
    if (ignoreChanges) {
        return;
    }
    if (Object.keys($settings.sessions).length > MAX_SESSIONS) {
        ignoreChanges = true;
        settings.update(($settings) => {
            const sessions = Object.keys($settings.sessions).map((key) => ({
                key,
                value: $settings.sessions[key],
            }));
            sessions.sort((a, b) => b.value.timestamp - a.value.timestamp);
            ignoreChanges = true;
            return {
                ...$settings,
                sessions: sessions
                    .slice(0, MAX_SESSIONS)
                    .reduce((acc, x) => ({ ...acc, [x.key]: x.value }), {}),
            };
        });
        ignoreChanges = false;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify($settings));
});
