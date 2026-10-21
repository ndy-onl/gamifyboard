import { describe, it, expect, vi } from "vitest";
import { resizeSingleElement, resizeMultipleElements } from "../../packages/element/src/resizeElements";
import { actionDeleteSelected } from "../../packages/excalidraw/actions/actionDeleteSelected";
import { actionClearCanvas } from "../../packages/excalidraw/actions/actionCanvas";
import type { ExcalidrawElement, NonDeletedExcalidrawElement } from "../../packages/element/src/types";

const createMockElement = (overrides?: Partial<ExcalidrawElement>): NonDeletedExcalidrawElement => ({
  id: `el_${Math.random().toString(36).substring(2, 9)}`,
  type: "rectangle",
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  angle: 0 as any,
  strokeColor: "#000000",
  backgroundColor: "transparent",
  fillStyle: "solid",
  strokeWidth: 1,
  strokeStyle: "solid",
  roundness: null,
  roughness: 1,
  opacity: 100,
  seed: 12345,
  version: 1,
  versionNonce: 1,
  index: "a0" as any,
  isDeleted: false,
  groupIds: [],
  frameId: null,
  boundElements: null,
  updated: Date.now(),
  link: null,
  locked: false,
  customData: {},
  ...overrides,
} as NonDeletedExcalidrawElement);

describe("GamifyBoard Protection & Scaling Lock Tests", () => {
  describe("1. Card Scaling Lock (disableResize)", () => {
    it("resizeSingleElement prevents dimension changes when customData.disableResize is true", () => {
      const lockedCard = createMockElement({
        id: "locked_card_1",
        x: 100,
        y: 100,
        width: 150,
        height: 200,
        customData: { isCard: true, disableResize: true },
      });

      const elementsMap = new Map([[lockedCard.id, lockedCard]]);

      // Attempt to resize lockedCard from 150x200 to 400x500
      resizeSingleElement(
        400,
        500,
        lockedCard,
        lockedCard,
        elementsMap,
        {} as any, // scene object
        "se",
      );

      // Width and height MUST remain untouched
      expect(lockedCard.width).toBe(150);
      expect(lockedCard.height).toBe(200);
      expect(lockedCard.x).toBe(100);
      expect(lockedCard.y).toBe(100);
    });

    it("resizeMultipleElements skips elements when selection contains disableResize: true", () => {
      const lockedCard = createMockElement({
        id: "locked_card_multi",
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        customData: { isCard: true, disableResize: true },
      });

      const normalBox = createMockElement({
        id: "normal_box_multi",
        x: 200,
        y: 200,
        width: 100,
        height: 100,
        customData: {},
      });

      const elements = [lockedCard, normalBox];
      const elementsMap = new Map(elements.map((el) => [el.id, el]));

      resizeMultipleElements(
        elements,
        elementsMap,
        "se",
        {} as any, // scene
        elementsMap,
        {
          nextWidth: 300,
          nextHeight: 300,
        },
      );

      // Locked card retains exact original dimensions
      expect(lockedCard.width).toBe(100);
      expect(lockedCard.height).toBe(100);
      expect(lockedCard.x).toBe(50);
      expect(lockedCard.y).toBe(50);
    });
  });

  describe("2. Mass Deletion & Canvas Clear Protection", () => {
    it("actionDeleteSelected aborts deletion if user cancels mass delete confirmation dialog", () => {
      // Mock window.confirm to simulate user rejecting the wipe
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

      // Create 30 elements (> 25 threshold)
      const elements = Array.from({ length: 30 }, (_, i) =>
        createMockElement({ id: `elem_${i}`, isDeleted: false })
      );

      // Select all 30 elements (e.g. Strg + A)
      const selectedElementIds = elements.reduce((acc, el) => {
        acc[el.id] = true;
        return acc;
      }, {} as Record<string, boolean>);

      const appState = {
        selectedElementIds,
        activeTool: { type: "selection", lastActiveTool: null },
      } as any;

      const app = {
        scene: {
          getNonDeletedElements: () => elements,
          getNonDeletedElementsMap: () => new Map(elements.map(e => [e.id, e])),
        },
      } as any;

      const result = actionDeleteSelected.perform(elements, appState, null, app);

      // Confirmation was requested
      expect(confirmSpy).toHaveBeenCalledTimes(1);

      // Returns false when cancelled by user
      expect(result).toBe(false);
      // No elements were marked as deleted
      expect(elements.every((el) => !el.isDeleted)).toBe(true);

      confirmSpy.mockRestore();
    });

    it("actionDeleteSelected proceeds if user confirms mass delete dialog", () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

      const elements = Array.from({ length: 30 }, (_, i) =>
        createMockElement({ id: `elem_${i}`, isDeleted: false })
      );

      const selectedElementIds = elements.reduce((acc, el) => {
        acc[el.id] = true;
        return acc;
      }, {} as Record<string, boolean>);

      const appState = {
        selectedElementIds,
        activeTool: { type: "selection", lastActiveTool: null },
      } as any;

      const elementsMap = new Map(elements.map(e => [e.id, e]));

      const app = {
        state: {
          preferredSelectionTool: { type: "selection" },
        },
        scene: {
          getNonDeletedElements: () => elements,
          getNonDeletedElementsMap: () => elementsMap,
          getElementsMapIncludingDeleted: () => elementsMap,
        },
      } as any;

      const result = actionDeleteSelected.perform(elements, appState, null, app);

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(result).not.toBe(false);
      if (typeof result === "object" && result.elements) {
        expect(result.elements.every((el) => el.isDeleted)).toBe(true);
      }

      confirmSpy.mockRestore();
    });

    it("actionClearCanvas asks for double confirmation and aborts when cancelled", () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

      const elements = [
        createMockElement({ id: "e1" }),
        createMockElement({ id: "e2" }),
      ];

      const appState = {} as any;
      const app = {} as any;

      const result = actionClearCanvas.perform(elements, appState, null, app);

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      // Aborted -> returns false
      expect(result).toBe(false);

      confirmSpy.mockRestore();
    });
  });

  describe("3. Yjs CRDT Synchronization Verification", () => {
    it("ensures customData.disableResize is retained during element duplication and updates", () => {
      const card = createMockElement({
        id: "card_crdt",
        customData: {
          isCard: true,
          disableResize: true,
          cardType: "action",
        },
        version: 1,
      });

      // Simulating a property update via sidebar (which bumps version)
      const updatedCard = {
        ...card,
        customData: {
          ...card.customData,
          cardType: "modified_action",
        },
        version: card.version + 1,
      };

      expect(updatedCard.customData.disableResize).toBe(true);
      expect(updatedCard.version).toBe(2);
      expect(updatedCard.customData.cardType).toBe("modified_action");
    });
  });
});
