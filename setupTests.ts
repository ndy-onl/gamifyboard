import "@testing-library/jest-dom";
import "vitest-canvas-mock";

// Explicitly mock CanvasRenderingContext2D if jest-canvas-mock is still causing issues
if (typeof window !== 'undefined') {
  window.HTMLCanvasElement.prototype.getContext = function(contextType: string) {
    if (contextType === '2d') {
      return new (window as any).CanvasRenderingContext2D();

import { configure } from "@testing-library/react";
import { vi } from "vitest";

import polyfill from "./packages/excalidraw/polyfill";
import { mockThrottleRAF } from "./packages/excalidraw/tests/helpers/mocks";
import { yellow } from "./packages/excalidraw/tests/helpers/colorize";
import {
  PolyfillLocalStorage,
  testPolyfills,
} from "./packages/excalidraw/tests/helpers/polyfills";

Object.assign(globalThis, testPolyfills);
PolyfillLocalStorage();

// By default testing-library dumps the entire serialized DOM into the error
// message whenever a `waitFor`/`getBy*` fails, which floods the test output
// (often hundreds of lines of HTML per failure). Strip it out unless
// VITE_DEBUG_DOM is enabled (see .env.test), e.g. `VITE_DEBUG_DOM=true yarn test`.
const debugDom = ["true", "1"].includes(process.env.VITE_DEBUG_DOM ?? "");
if (!debugDom) {
  configure({
    getElementError: (message) => {
      const error = new Error(message ?? undefined);
      error.name = "TestingLibraryElementError";
      return error;
    },
  });
}

vi.mock("@excalidraw/common", async (importOriginal) => {
  const module = await importOriginal<typeof import("@excalidraw/common")>();

  return {
    ...module,
    throttleRAF: mockThrottleRAF,
  };
});

// mock for pep.js not working with setPointerCapture()
HTMLElement.prototype.setPointerCapture = vi.fn();

require("fake-indexeddb/auto");

polyfill();

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, "FontFace", {
  enumerable: true,
  value: class {
    private family: string;
    private source: string;
    private descriptors: any;
    private status: string;
    private unicodeRange: string;

    constructor(family, source, descriptors) {
      this.family = family;
      this.source = source;
      this.descriptors = descriptors;
      this.status = "unloaded";
      this.unicodeRange = "U+0000-00FF";
    }
    return null;
  };
}