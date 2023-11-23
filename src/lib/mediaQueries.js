import { writable } from 'svelte/store';

const mediaQueryStore = (query) => {
    const match = window.matchMedia(query);
    return writable(match.matches, (set) => {
        const setValue = () => set(window.matchMedia(query).matches);
        match.addEventListener('change', setValue);
        return () => match.removeEventListener('change', setValue);
    });
};

export const browserDarkMode = mediaQueryStore('(prefers-color-scheme: dark)');
export const screenMobile = mediaQueryStore('(max-width: 768px)');
