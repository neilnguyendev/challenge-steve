import "@testing-library/jest-dom/vitest";

/**
 * jsdom ships no matchMedia, and anything that adapts to a colour scheme or to
 * reduced motion calls it on mount. Without this the component throws before
 * it renders, which looks like a component bug rather than a missing browser
 * API.
 *
 * Defaults every query to "does not match", so tests describe the light,
 * full-motion case unless they say otherwise.
 */
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    media: query,
    matches: false,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}
