import React from "react";
import { waitFor, act } from "@testing-library/react";
import { render } from "./test-utils";

import ExcalidrawApp from "../App";

describe("Gamify Edge Cases", () => {
  it("should synchronize PlayerSlots to the one with the highest version", async () => {
    act(() => {
      render(<ExcalidrawApp />);
    });

    const { excalidrawAPI, checkGameState } = await waitFor(() => {
      if (!(window as any).ExcalidrawHandle) {
        throw new Error("Excalidraw handle not available yet.");
      }
      return (window as any).ExcalidrawHandle;
    });

    // Create two player slots, slot2 has a higher version
    excalidrawAPI.updateScene({
      elements: [
        { id: "slot1", type: "text", text: "Old Name", version: 1, customData: { isPlayerSlot: true, playerSlotId: "player1" } },
        { id: "slot2", type: "text", text: "New Name", version: 5, customData: { isPlayerSlot: true, playerSlotId: "player1" } },
      ],
    });

    // Trigger game state check (runs on pointerUp normally)
    act(() => {
      checkGameState(excalidrawAPI.getSceneElements());
    });

    // Verify slot1 text synced to slot2's text
    await waitFor(
      () => {
        const elements = excalidrawAPI.getSceneElements();
        const slot1 = elements.find((el: any) => el.id === "slot1");
        expect(slot1?.text).toBe("New Name");
      },
      { timeout: 5000 },
    );
  });

  it("should prevent teleporter ping-pong loop by picking the latest trigger", async () => {
    act(() => {
      render(<ExcalidrawApp />);
    });

    const { excalidrawAPI } = await waitFor(() => (window as any).ExcalidrawHandle);

    let scrollToContentCalls = 0;
    (excalidrawAPI as any).scrollToContent = () => { scrollToContentCalls++; };
    
    // Simulate multiple recent teleport triggers
    act(() => {
      excalidrawAPI.updateScene({
        elements: [
          { id: "frameA", type: "frame", name: "Runde 1", customData: { globalTeleportTrigger: Date.now() - 500 } },
          { id: "frameB", type: "frame", name: "Runde 2", customData: { globalTeleportTrigger: Date.now() - 100 } }, // Latest
        ],
      });
    });

    // Wait until onChange processes it
    await waitFor(() => {
      expect((window as any).lastTeleportTrigger).toBeDefined();
    });

    // Expect that scrollToContent was only called ONCE for the latest frame, preventing an infinite loop
    expect(scrollToContentCalls).toBe(1);
  });

  it("should teleport to the Start Frame on initial load", async () => {
    (window as any).hasInitialTeleported = false;
    
    act(() => {
      render(<ExcalidrawApp />);
    });

    const { excalidrawAPI } = await waitFor(() => (window as any).ExcalidrawHandle);

    let scrolledToStart = false;
    (excalidrawAPI as any).scrollToContent = (frame: any) => { 
        if (frame.name === "Start") scrolledToStart = true;
    };

    act(() => {
      excalidrawAPI.updateScene({
        elements: [
          { id: "frameStart", type: "frame", name: "Start", customData: { isStartFrame: true } },
        ],
      });
    });

    await waitFor(() => {
      expect(scrolledToStart).toBe(true);
    }, { timeout: 2000 });
  });
});
