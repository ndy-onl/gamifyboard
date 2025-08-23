import { waitFor, act } from "@testing-library/react";

import React from "react";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import type { Radians } from "@excalidraw/math";
import type {
  FractionalIndex,
  ExcalidrawRectangleElement,
} from "@excalidraw/element/types";

import ExcalidrawApp from "../App";

import { render } from "./test-utils";

const createDefaultElementProps = (
  overrides?: Omit<Partial<ExcalidrawRectangleElement>, "type">,
): ExcalidrawRectangleElement => ({
  id: `test-element-${Math.random()}`,
  type: "rectangle",
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  strokeColor: "#000000",
  backgroundColor: "transparent",
  fillStyle: "solid",
  strokeWidth: 1,
  strokeStyle: "solid",
  roundness: null,
  roughness: 1,
  opacity: 100,
  angle: 0 as Radians,
  seed: Math.floor(Math.random() * 1000000),
  version: 1,
  versionNonce: Math.floor(Math.random() * 1000000),
  index: "a1" as FractionalIndex, // Added missing index property
  isDeleted: false,
  groupIds: [],
  frameId: null,
  boundElements: null,
  updated: Date.now(),
  link: null,
  locked: false,
  ...overrides,
});

describe("Counter Functions", () => {
  it("should convert a rectangle to a counter and allow manual counting", async () => {
    act(() => {
      render(<ExcalidrawApp onLoginClick={() => {}} />);
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { excalidrawAPI, checkGameState } = await waitFor(() => {
      // eslint-disable-line @typescript-eslint/no-unused-vars
      if (!(window as any).ExcalidrawHandle) {
        throw new Error("Excalidraw handle not available yet.");
      }
      return (window as any).ExcalidrawHandle;
    });

    // 1. Create a rectangle
    const rectangleId = "rectangle-1";
    act(() => {
      excalidrawAPI.updateScene({
        elements: [
          createDefaultElementProps({
            id: rectangleId,
          }),
        ],
      });
    });

    // 2. Select the rectangle
    act(() => {
      excalidrawAPI.updateScene({
        appState: { selectedElementIds: { [rectangleId]: true } },
      });
    });

    // 3. Wait for the sidebar to appear and convert to counter
    await waitFor(() => {
      const sidebar = document.querySelector(".properties-sidebar");
      expect(sidebar).not.toBeNull();
      const radio = sidebar?.querySelector(
        "input[value=counter]",
      ) as HTMLInputElement;
      expect(radio).not.toBeNull();
      act(() => {
        radio.click();
      });
    });

    let elements = excalidrawAPI.getSceneElements();
    let counter = elements.find(
      (el: ExcalidrawElement) => el.id === rectangleId,
    );
    expect(counter?.type).toBe("counter");
    expect(counter?.customData?.value).toBe(0);

    // 4. Manual counting
    await waitFor(() => {
      const sidebar = document.querySelector(".properties-sidebar");
      const plusButton = sidebar?.querySelector(
        "button:not(:disabled)",
      ) as HTMLButtonElement;
      expect(plusButton).not.toBeNull();
      act(() => {
        plusButton.click();
      });
    });

    elements = excalidrawAPI.getSceneElements();
    counter = elements.find((el: ExcalidrawElement) => el.id === rectangleId);
    expect(counter?.customData?.value).toBe(1);
  });

  it("should automatically count cards in a zone", async () => {
    act(() => {
      render(<ExcalidrawApp onLoginClick={() => {}} />);
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { excalidrawAPI, checkGameState } = await waitFor(() => {
      // eslint-disable-line @typescript-eslint/no-unused-vars
      if (!(window as any).ExcalidrawHandle) {
        throw new Error("Excalidraw handle not available yet.");
      }
      return (window as any).ExcalidrawHandle;
    });

    const zoneId = "zone-1";
    const cardId = "card-1";
    const counterId = "counter-1";
    const cardType = "fruit";

    act(() => {
      excalidrawAPI.updateScene({
        elements: [
          createDefaultElementProps({
            id: zoneId,
            x: 100,
            y: 100,
            width: 200,
            height: 200,
            customData: { isZone: true, acceptedCardTypes: cardType },
          }),
          createDefaultElementProps({
            id: cardId,
            x: 0,
            y: 0,
            width: 50,
            height: 50,
            customData: { isCard: true, cardType },
          }),
          {
            ...createDefaultElementProps({
              id: counterId,
              x: 400,
              y: 100,
              customData: { countsType: cardType, value: 0 },
            }),
            type: "counter",
          } as ExcalidrawElement,
        ],
      });
    });

    act(() => {
      checkGameState(excalidrawAPI, excalidrawAPI.getSceneElements());
    });

    await waitFor(() => {
      const elements = excalidrawAPI.getSceneElements();
      const counter = elements.find(
        (el: ExcalidrawElement) => el.id === counterId,
      );
      expect(counter?.customData?.value).toBe(0);
    });

    act(() => {
      excalidrawAPI.updateScene({
        elements: excalidrawAPI
          .getSceneElements()
          .map((el: ExcalidrawElement) =>
            el.id === cardId ? { ...el, x: 150, y: 150 } : el,
          ),
      });
    });

    act(() => {
      checkGameState(excalidrawAPI, excalidrawAPI.getSceneElements());
    });

    await waitFor(() => {
      const elements = excalidrawAPI.getSceneElements();
      const counter = elements.find(
        (el: ExcalidrawElement) => el.id === counterId,
      );
      expect(counter?.customData?.value).toBe(1);
    });
  });
});
