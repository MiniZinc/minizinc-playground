import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach, vi } from 'vitest';

if (!window.matchMedia) {
    window.matchMedia = (media) => ({
        matches: false,
        media,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent() {
            return false;
        },
    });
}

if (!Element.prototype.getAnimations) {
    Element.prototype.getAnimations = () => [];
}

if (!HTMLElement.prototype.scrollTo) {
    HTMLElement.prototype.scrollTo = () => {};
}

if (!Element.prototype.animate) {
    Element.prototype.animate = () => ({
        cancel() {},
        finished: Promise.resolve(),
    });
}

if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = () => [
        { bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0 },
    ];
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});
