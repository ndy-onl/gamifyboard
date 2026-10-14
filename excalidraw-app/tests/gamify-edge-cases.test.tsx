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

    const { excalidrawAPI } = await waitFor(() => {
      if (!(window as any).ExcalidrawHandle) throw new Error('Handle not ready');
      return (window as any).ExcalidrawHandle;
    });

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

    const { excalidrawAPI } = await waitFor(() => {
      if (!(window as any).ExcalidrawHandle) throw new Error('Handle not ready');
      return (window as any).ExcalidrawHandle;
    });

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
  it("should prioritize actively edited player slot over higher version sibling slot", async () => {
    act(() => {
      render(<ExcalidrawApp />);
    });

    const { excalidrawAPI, checkGameState } = await waitFor(() => {
      if (!(window as any).ExcalidrawHandle) throw new Error('Handle not ready');
      return (window as any).ExcalidrawHandle;
    });

    const slot1 = {
      id: "slot1",
      type: "text",
      text: "Old Name",
      originalText: "Old Name",
      version: 50,
      versionNonce: 1,
      x: 0,
      y: 0,
      width: 100,
      height: 25,
      fontSize: 20,
      fontFamily: 1,
      textAlign: "left",
      verticalAlign: "top",
      baseline: 18,
      lineHeight: 1.2,
      groupIds: [],
      customData: { isPlayerSlot: true, playerSlotId: "p2" },
    };

    const slot2 = {
      id: "slot2",
      type: "text",
      text: "Adrian",
      originalText: "Adrian",
      version: 10,
      versionNonce: 2,
      x: 100,
      y: 0,
      width: 100,
      height: 25,
      fontSize: 20,
      fontFamily: 1,
      textAlign: "left",
      verticalAlign: "top",
      baseline: 18,
      lineHeight: 1.2,
      groupIds: [],
      customData: { isPlayerSlot: true, playerSlotId: "p2" },
    };

    act(() => {
      excalidrawAPI.updateScene({
        elements: [slot1, slot2],
      });
    });

    act(() => {
      excalidrawAPI.updateScene({
        appState: {
          selectedElementIds: { slot2: true },
        },
      });
    });

    act(() => {
      checkGameState(excalidrawAPI.getSceneElements());
    });

    // Expect slot1 to sync to Adrian, NOT revert slot2 back to Old Name
    await waitFor(() => {
      const elements = excalidrawAPI.getSceneElements();
      const s1 = elements.find((el: any) => el.id === "slot1");
      const s2 = elements.find((el: any) => el.id === "slot2");
      expect(s2?.text).toBe("Adrian");
      expect(s1?.text).toBe("Adrian");
    });
  });

  it("should trigger render on global timer tick when timer is running", async () => {
    (window as any).__gamifyTimerTick = undefined;
    act(() => {
      render(<ExcalidrawApp />);
    });

    const { excalidrawAPI } = await waitFor(() => {
      if (!(window as any).ExcalidrawHandle) throw new Error('Handle not ready');
      return (window as any).ExcalidrawHandle;
    });

    act(() => {
      excalidrawAPI.updateScene({
        elements: [
          { id: "timer1", type: "rectangle", width: 100, height: 50, customData: { isTimerDisplay: true, timerName: "T1", endTime: Date.now() + 60000 } },
        ],
      });
    });

    // Wait for the 1-second interval tick
    await waitFor(() => {
      expect((window as any).__gamifyTimerTick).toBeDefined();
    }, { timeout: 4000 });
  });
});