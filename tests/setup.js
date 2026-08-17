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

// jsdom has no Web Animations API, and Svelte's transitions drive one directly,
// so any component that transitions in — a modal, say — throws on mount without
// this.
//
// The stub must actually *finish*, not merely exist: Svelte removes a
// transitioning-out element only when its animation reports completion, so a stub
// that never fires leaves closed modals in the DOM forever and every
// `queryByText(...)).toBeNull()` silently fails. Finishing on the next microtask
// makes transitions instantaneous rather than absent.
if (!Element.prototype.animate) {
    Element.prototype.animate = () => {
        const listeners = new Set();
        let onfinish = null;
        let done = false;
        const finish = () => {
            if (done) {
                return;
            }
            done = true;
            onfinish?.();
            for (const listener of listeners) {
                listener();
            }
        };
        const animation = {
            currentTime: 0,
            startTime: 0,
            playState: 'finished',
            effect: null,
            finished: Promise.resolve(),
            play() {},
            pause() {},
            cancel() {
                done = true;
            },
            finish,
            addEventListener(event, listener) {
                if (event === 'finish') {
                    listeners.add(listener);
                    setTimeout(finish, 0);
                }
            },
            removeEventListener(event, listener) {
                listeners.delete(listener);
            },
        };
        Object.defineProperty(animation, 'onfinish', {
            get: () => onfinish,
            set(fn) {
                onfinish = fn;
                if (fn) {
                    setTimeout(finish, 0);
                }
            },
        });
        return animation;
    };
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
