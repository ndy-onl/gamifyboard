import "@testing-library/jest-dom";
import "vitest-canvas-mock";

// Explicitly mock CanvasRenderingContext2D if jest-canvas-mock is still causing issues
if (typeof window !== 'undefined') {
  window.HTMLCanvasElement.prototype.getContext = function(contextType: string) {
    if (contextType === '2d') {
      return new (window as any).CanvasRenderingContext2D();
    }
    return null;
  };
}