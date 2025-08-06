import React from "react";
import { waitFor, render, act } from "@excalidraw/excalidraw/tests/test-utils";

import ExcalidrawApp from "../App";

describe("Gamify Functions", () => {
  it("should allow creating a zone and moving a card into it", async () => {
    act(() => {
      render(<ExcalidrawApp />);
    });

    // Use waitFor to poll for the single handle object on the window
    const { excalidrawAPI, checkGameState } = await waitFor(() => {
      if (!(window as any).ExcalidrawHandle) {
        throw new Error("Excalidraw handle not available yet.");
      }
      return (window as any).ExcalidrawHandle;
    });

    const zoneId = "zone1";
    const cardId = "card1";
    const zoneType = "testZone";
    const cardType = "testCard";

    // 2. Create a zone and a card
    excalidrawAPI.updateScene({
      elements: [
        {
          id: zoneId,
          type: "rectangle",
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          backgroundColor: "#ffffff",
          customData: { isZone: true, zoneType, acceptedCardTypes: cardType },
        },
        {
          id: cardId,
          type: "rectangle",
          x: 200,
          y: 200,
          width: 50,
          height: 50,
          backgroundColor: "#ff0000",
          customData: { isCard: true, cardType },
        },
      ],
    });

    // 3. Check that the zone is NOT initially green
    let elements = excalidrawAPI.getSceneElements();
    let zone = elements.find((el) => el.id === zoneId);
    expect(zone?.backgroundColor).not.toBe("#aaffaa");

    // 4. Move the card into the zone
    const updatedCard = {
      ...excalidrawAPI.getSceneElements().find((el) => el.id === cardId)!,
      x: 10,
      y: 10,
    };
    excalidrawAPI.updateScene({ elements: [zone!, updatedCard] });

    // 5. Trigger game state check and wait for the result
    act(() => {
      checkGameState(excalidrawAPI.getSceneElements());
    });

    await waitFor(
      () => {
        elements = excalidrawAPI.getSceneElements();
        zone = elements.find((el) => el.id === zoneId);
        // Now the zone should be green
        expect(zone?.backgroundColor).toBe("#aaffaa");
      },
      { timeout: 5000 },
    );
  });
});
