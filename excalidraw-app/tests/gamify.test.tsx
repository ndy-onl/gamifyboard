import { waitFor, render } from "@excalidraw/excalidraw/tests/test-utils";

import React, { createRef } from "react";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { Radians } from "@excalidraw/math";
import type {
  FractionalIndex,
  ExcalidrawRectangleElement,
} from "@excalidraw/element/types";

import ExcalidrawApp, { type AppRef } from "../App";

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

describe("Gamify Functions", () => {
  it("should allow creating a zone and moving a card into it", async () => {
    let excalidrawAPI: ExcalidrawImperativeAPI;
    const appRef = createRef<AppRef>();
    const renderResult = await render(<ExcalidrawApp ref={appRef} />);
    const container = renderResult.container;
    let excalidrawContainer: Element;

    const zoneId = "zone-1";
    const zoneType = "fruit";
    const cardId = "card-1";
    const cardType = "fruit";

    await waitFor(async () => {
      expect(appRef.current?.excalidrawAPI).not.toBeNull();
      excalidrawAPI = appRef.current!.excalidrawAPI!;
      excalidrawContainer = container.querySelector(".excalidraw-container")!;
      expect(excalidrawContainer).not.toBeNull();

      // 1. Create a zone
      excalidrawAPI.updateScene({
        elements: [
          createDefaultElementProps({
            id: zoneId,
            x: 100,
            y: 100,
            width: 200,
            height: 200,
            customData: {
              isZone: true,
              acceptedCardTypes: zoneType,
            },
          }),
        ],
      });

      let elements = excalidrawAPI.getSceneElements();
      let zone = elements.find((el) => el.id === zoneId);

      // 2. Create a card
      excalidrawAPI.updateScene({
        elements: [
          ...excalidrawAPI.getSceneElements(), // Keep existing elements
          createDefaultElementProps({
            id: cardId,
            x: 50,
            y: 50,
            width: 50,
            height: 50,
            customData: {
              isCard: true,
              cardType,
            },
          }),
        ],
      });

      elements = excalidrawAPI.getSceneElements();
      zone = elements.find((el) => el.id === zoneId);
      const card = elements.find((el) => el.id === cardId);

      // Initial check: zone should not be green
      expect(zone?.backgroundColor).not.toBe("#aaffaa");

      // 3. Move the card into the zone
      excalidrawAPI.updateScene({
        elements: [
          ...elements.filter((el) => el.id !== cardId), // Remove old card
          {
            ...card!,
            x: 150, // Inside the zone
            y: 150, // Inside the zone
          },
        ],
      });

      appRef.current!.checkGameState(excalidrawAPI.getSceneElements());

      // Wait for the scene to update and check the zone's background color
      await waitFor(() => {
        elements = excalidrawAPI.getSceneElements();
        zone = elements.find((el) => el.id === zoneId);
        expect(zone?.backgroundColor).toBe("#aaffaa"); // Green for correct
      });

      // Move the card out of the zone
      excalidrawAPI.updateScene({
        elements: [
          ...elements.filter((el) => el.id !== cardId),
          {
            ...card!,
            x: 10, // Outside the zone
            y: 10, // Outside the zone
          },
        ],
      });

      appRef.current!.checkGameState(excalidrawAPI.getSceneElements());

      // Wait for the scene to update and check the zone's background color
      await waitFor(() => {
        elements = excalidrawAPI.getSceneElements();
        zone = elements.find((el) => el.id === zoneId);
        expect(zone?.backgroundColor).not.toBe("#aaffaa"); // Not green anymore
      });
    });
  });
});
