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
    const appRef = React.createRef<AppRef>();
    await render(<ExcalidrawApp ref={appRef} />);

    await waitFor(() => {
      expect(appRef.current).not.toBeNull();
      expect(appRef.current?.excalidrawAPI).not.toBeNull();
    });

    const excalidrawAPI = appRef.current!.excalidrawAPI!;

    // 1. Create a zone and a card
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

    await waitFor(() => {
      const elements = excalidrawAPI.getSceneElements();
      const zone = elements.find((el) => el.id === zoneId);
      expect(zone?.backgroundColor).not.toBe("#aaffaa");
    });

    // 2. Move the card into the zone
    const card = excalidrawAPI.getSceneElements().find((el) => el.id === cardId)!;
    excalidrawAPI.updateScene({
      elements: [
        ...excalidrawAPI.getSceneElements().filter((el) => el.id !== cardId),
        {
          ...card,
          x: 150, // Inside the zone
          y: 150, // Inside the zone
        },
      ],
    });

    appRef.current!.checkGameState(excalidrawAPI.getSceneElements());

    // 3. Check if the zone is green
    await waitFor(() => {
      const elements = excalidrawAPI.getSceneElements();
      const zone = elements.find((el) => el.id === zoneId);
      expect(zone?.backgroundColor).toBe("#aaffaa");
    });
  });
});
