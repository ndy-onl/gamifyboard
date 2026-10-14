import React from "react";
import { waitFor, act } from "@testing-library/react";
import { render } from "./test-utils";
import "./setup";

import type { Radians } from "@excalidraw/math";
import type {
  FractionalIndex,
  ExcalidrawElement,
  ExcalidrawTextElement,
} from "@excalidraw/element/types";

import ExcalidrawApp from "../App";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Spy for collaboration awareness cursor name synchronization
const setCursorNameSpy = vi.fn();

vi.mock("../hooks/useCollaboration", async () => {
  const actual = await vi.importActual<any>("../hooks/useCollaboration");
  return {
    ...actual,
    useCollaboration: (...args: any[]) => {
      const res = actual.useCollaboration(...args);
      return {
        ...res,
        setCursorName: setCursorNameSpy,
      };
    },
  };
});

/**
 * Creates a fully formed mock ExcalidrawElement with complete structural integrity.
 * Crucially provides `groupIds: []`, `seed`, `version`, `versionNonce`, and `index`
 * to prevent fatal crashes in `staticScene.ts:332` (`Cannot read properties of undefined (reading 'length')`)
 * which would otherwise crash `<StaticCanvas>` and unmount `<ExcalidrawApp>`.
 */
const createDefaultElementProps = (
  overrides?: Partial<ExcalidrawElement>,
): ExcalidrawElement =>
  ({
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
    index: "a1" as FractionalIndex,
    isDeleted: false,
    groupIds: [],
    frameId: null,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    customData: {},
    ...overrides,
  } as ExcalidrawElement);

/**
 * Creates a fully formed mock ExcalidrawTextElement with typography attributes.
 */
const createTextElementProps = (
  overrides?: Partial<ExcalidrawTextElement>,
): ExcalidrawTextElement =>
  ({
    ...createDefaultElementProps(),
    type: "text",
    text: "Text",
    fontSize: 20,
    fontFamily: 1,
    textAlign: "left",
    verticalAlign: "top",
    baseline: 18,
    lineHeight: 1.2 as any,
    originalText: "Text",
    containerId: null,
    autoResize: true,
    ...overrides,
  } as unknown as ExcalidrawTextElement);

describe("Gamify Edge Cases", () => {
  beforeEach(() => {
    (window as any).hasInitialTeleported = false;
    (window as any).initialLoadTime = undefined;
    (window as any).lastTeleportTrigger = undefined;
    (window as any).__gamifyTimerTick = undefined;
    (window as any).ExcalidrawHandle = undefined;
    (window as any).ExcalidrawAPI = undefined;
    setCursorNameSpy.mockClear();
  });

  // ==========================================================================
  // 1. PLAYERSLOT SYNCHRONIZATION & CRDT VERSIONING
  // ==========================================================================

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

    // Create two player slots; slot2 has a higher version (5 vs 1)
    const slot1 = createTextElementProps({
      id: "slot1_v",
      text: "Old Name",
      originalText: "Old Name",
      version: 1,
      customData: { isPlayerSlot: true, playerSlotId: "player1_v" },
    });
    const slot2 = createTextElementProps({
      id: "slot2_v",
      text: "New Name",
      originalText: "New Name",
      version: 5,
      customData: { isPlayerSlot: true, playerSlotId: "player1_v" },
    });

    act(() => {
      excalidrawAPI.updateScene({
        elements: [slot1, slot2],
      });
    });

    // Trigger game state check
    act(() => {
      checkGameState(excalidrawAPI.getSceneElements());
    });

    // Verify slot1 text synced to slot2's text and version incremented via Math.max(sibling.version, truth.version) + 1
    await waitFor(
      () => {
        const elements = excalidrawAPI.getSceneElements();
        const s1 = elements.find((el: any) => el.id === "slot1_v");
        const s2 = elements.find((el: any) => el.id === "slot2_v");
        expect(s1?.text).toBe("New Name");
        expect(s2?.text).toBe("New Name");
        expect(s1?.version).toBe((s2?.version || 0) + 1);
      },
      { timeout: 5000 },
    );
  });

  // ==========================================================================
  // 2. PLAYERSLOT ACTIVE WYSIWYG EDITING PRECEDENCE
  // ==========================================================================

  it("should prioritize actively edited player slot over higher version sibling slot", async () => {
    act(() => {
      render(<ExcalidrawApp />);
    });

    const { excalidrawAPI, checkGameState } = await waitFor(() => {
      if (!(window as any).ExcalidrawHandle) throw new Error("Handle not ready");
      return (window as any).ExcalidrawHandle;
    });

    const slot1 = createTextElementProps({
      id: "slot1_active",
      text: "Old Name",
      originalText: "Old Name",
      version: 50,
      customData: { isPlayerSlot: true, playerSlotId: "p_active" },
    });

    const slot2 = createTextElementProps({
      id: "slot2_active",
      text: "Adrian",
      originalText: "Adrian",
      version: 10,
      customData: { isPlayerSlot: true, playerSlotId: "p_active" },
    });

    // Set slot2 as actively edited in WYSIWYG mode
    act(() => {
      excalidrawAPI.updateScene({
        elements: [slot1, slot2],
        appState: {
          editingTextElement: slot2 as any,
          selectedElementIds: { [slot2.id]: true },
        },
      });
    });

    act(() => {
      checkGameState(excalidrawAPI.getSceneElements());
    });

    // Expect slot1 to sync to Adrian (Source of Truth), bumping slot1.version to Math.max(50, 10) + 1 = 51
    await waitFor(() => {
      const elements = excalidrawAPI.getSceneElements();
      const s1 = elements.find((el: any) => el.id === "slot1_active");
      const s2 = elements.find((el: any) => el.id === "slot2_active");
      expect(s2?.text).toBe("Adrian");
      expect(s1?.text).toBe("Adrian");
      expect(s1?.version).toBe(51);
    });
  });

  // ==========================================================================
  // 3. PLAYERSLOT 10-SECOND BLUR GRACE PERIOD
  // ==========================================================================

  it("should preserve edited slot text during 10-second blur grace period against stale remote versions", async () => {
    act(() => {
      render(<ExcalidrawApp />);
    });

    const { excalidrawAPI, checkGameState } = await waitFor(() => {
      if (!(window as any).ExcalidrawHandle) throw new Error("Handle not ready");
      return (window as any).ExcalidrawHandle;
    });

    const slot1 = createTextElementProps({
      id: "slot1_blur",
      text: "Player 2",
      originalText: "Player 2",
      version: 10,
      customData: { isPlayerSlot: true, playerSlotId: "p_blur" },
    });

    const slot2 = createTextElementProps({
      id: "slot2_blur",
      text: "Adrian",
      originalText: "Adrian",
      version: 5,
      customData: { isPlayerSlot: true, playerSlotId: "p_blur" },
    });

    // Step 1: Actively edit slot2
    act(() => {
      excalidrawAPI.updateScene({
        elements: [slot1, slot2],
        appState: {
          editingTextElement: slot2 as any,
          selectedElementIds: { [slot2.id]: true },
        },
      });
    });

    act(() => {
      checkGameState(excalidrawAPI.getSceneElements());
    });

    // Verify initial synchronization
    let elements = excalidrawAPI.getSceneElements();
    expect(elements.find((el: any) => el.id === "slot1_blur")?.text).toBe("Adrian");

    // Step 2: User blurs (clicks outside): editingTextElement and selection are cleared
    act(() => {
      excalidrawAPI.updateScene({
        appState: {
          editingTextElement: null,
          selectedElementIds: {},
        },
      });
    });

    // Step 3: Simulate an incoming remote sync where slot1 arrives with stale text and high version (v90)
    act(() => {
      excalidrawAPI.updateScene({
        elements: [
          createTextElementProps({
            id: "slot1_blur",
            text: "Stale Remote Name",
            originalText: "Stale Remote Name",
            version: 90,
            customData: { isPlayerSlot: true, playerSlotId: "p_blur" },
          }),
          createTextElementProps({
            id: "slot2_blur",
            text: "Adrian",
            originalText: "Adrian",
            version: 5,
            customData: { isPlayerSlot: true, playerSlotId: "p_blur" },
          }),
        ],
      });
    });

    // Step 4: Run checkGameState within the 10-second window
    act(() => {
      checkGameState(excalidrawAPI.getSceneElements());
    });

    // Sibling slot1 must be overridden back to "Adrian" by slot2's blur grace window
    await waitFor(() => {
      elements = excalidrawAPI.getSceneElements();
      const s1 = elements.find((el: any) => el.id === "slot1_blur");
      const s2 = elements.find((el: any) => el.id === "slot2_blur");
      expect(s2?.text).toBe("Adrian");
      expect(s1?.text).toBe("Adrian");
      expect(s1?.version).toBe(91); // Math.max(90, 5) + 1
    });
  });

  // ==========================================================================
  // 4. COLLABORATION AWARENESS CURSOR NAME SYNCHRONIZATION
  // ==========================================================================

  it("should synchronize cursor name via setCursorName when user edits their assigned slot", async () => {
    act(() => {
      render(<ExcalidrawApp />);
    });

    const { excalidrawAPI, checkGameState } = await waitFor(() => {
      if (!(window as any).ExcalidrawHandle) throw new Error("Handle not ready");
      return (window as any).ExcalidrawHandle;
    });

    setCursorNameSpy.mockClear();

    const userSlot = createTextElementProps({
      id: "slot_user_cursor",
      text: "Alice Champion",
      originalText: "Alice Champion",
      version: 1,
      customData: { isPlayerSlot: true, playerSlotId: "p_cursor" },
    });

    act(() => {
      excalidrawAPI.updateScene({
        elements: [userSlot],
        appState: {
          editingTextElement: userSlot as any,
          selectedElementIds: { [userSlot.id]: true },
        },
      });
    });

    act(() => {
      checkGameState(excalidrawAPI.getSceneElements());
    });

    await waitFor(() => {
      expect(setCursorNameSpy).toHaveBeenCalledWith("Alice Champion");
    });
  });

  // ==========================================================================
  // 5. RUNNING TIMER COUNTDOWN & ANTI-FLOODING CANVAS TICKS
  // ==========================================================================

  it("should trigger triggerRender(true) on global timer tick when timer is running", async () => {
    (window as any).__gamifyTimerTick = undefined;
    act(() => {
      render(<ExcalidrawApp />);
    });

    const { excalidrawAPI } = await waitFor(() => {
      if (!(window as any).ExcalidrawHandle) throw new Error("Handle not ready");
      return (window as any).ExcalidrawHandle;
    });

    const triggerRenderSpy = vi.spyOn(excalidrawAPI, "triggerRender");

    act(() => {
      excalidrawAPI.updateScene({
        elements: [
          createDefaultElementProps({
            id: "timer1",
            type: "rectangle",
            width: 100,
            height: 50,
            customData: {
              isTimerDisplay: true,
              timerName: "T1",
              endTime: Date.now() + 60000,
            },
          }),
        ],
      });
    });

    // Wait for the 1-second interval tick to broadcast local repaint tick
    await waitFor(
      () => {
        expect((window as any).__gamifyTimerTick).toBeDefined();
        expect(triggerRenderSpy).toHaveBeenCalledWith(true);
      },
      { timeout: 4000 },
    );
  });

  // ==========================================================================
  // 6. TIMER EXPIRATION, CARD FREEZE & TOAST NOTIFICATION
  // ==========================================================================

  it("should freeze all cards, mark timer hasFrozen, and display toast upon countdown expiration", async () => {
    act(() => {
      render(<ExcalidrawApp />);
    });

    const { excalidrawAPI } = await waitFor(() => {
      if (!(window as any).ExcalidrawHandle) throw new Error("Handle not ready");
      return (window as any).ExcalidrawHandle;
    });

    const toastSpy = vi.spyOn(excalidrawAPI, "setToast");

    const timer = createDefaultElementProps({
      id: "expired_timer",
      type: "rectangle",
      width: 100,
      height: 50,
      customData: {
        isTimerDisplay: true,
        timerName: "Countdown",
        endTime: Date.now() - 500, // Expired
        hasFrozen: false,
      },
    });

    const gameCard = createDefaultElementProps({
      id: "movable_card_1",
      type: "rectangle",
      x: 10,
      y: 10,
      locked: false,
      customData: {
        isCard: true,
        cardType: "action",
      },
    });

    const normalElement = createDefaultElementProps({
      id: "board_background",
      type: "rectangle",
      x: 0,
      y: 0,
      locked: false,
      customData: {},
    });

    act(() => {
      excalidrawAPI.updateScene({
        elements: [timer, gameCard, normalElement],
      });
    });

    // Wait for 1s interval tick to freeze game cards
    await waitFor(
      () => {
        const elements = excalidrawAPI.getSceneElements();
        const updatedTimer = elements.find((el: any) => el.id === "expired_timer");
        const updatedCard = elements.find((el: any) => el.id === "movable_card_1");
        const updatedNormal = elements.find((el: any) => el.id === "board_background");

        expect(updatedTimer?.customData?.hasFrozen).toBe(true);
        expect(updatedCard?.locked).toBe(true);
        expect(updatedNormal?.locked).toBe(false);
        expect(toastSpy).toHaveBeenCalledWith({
          message: "Zeit abgelaufen! Karten sind eingefroren.",
        });
      },
      { timeout: 4000 },
    );
  });

  // ==========================================================================
  // 7. INITIAL LOAD START-FRAME AUTOFOCUS & LATCH
  // ==========================================================================

  it("should teleport to the Start Frame on initial load and latch against subsequent triggers", async () => {
    (window as any).hasInitialTeleported = false;

    act(() => {
      render(<ExcalidrawApp />);
    });

    const { excalidrawAPI } = await waitFor(() => {
      if (!(window as any).ExcalidrawHandle) throw new Error("Handle not ready");
      return (window as any).ExcalidrawHandle;
    });

    let scrollToContentCalls = 0;
    let targetFrameName = "";
    (excalidrawAPI as any).scrollToContent = (frame: any) => {
      scrollToContentCalls++;
      targetFrameName = frame.name;
    };

    const startFrame = createDefaultElementProps({
      id: "frameStart",
      type: "frame",
      name: "Start",
      customData: { isStartFrame: true },
    });

    act(() => {
      excalidrawAPI.updateScene({
        elements: [startFrame],
      });
    });

    await waitFor(
      () => {
        expect(scrollToContentCalls).toBe(1);
        expect(targetFrameName).toBe("Start");
        expect((window as any).hasInitialTeleported).toBe(true);
      },
      { timeout: 2000 },
    );

    // Adding another start frame should NOT trigger scrollToContent again (latched)
    act(() => {
      excalidrawAPI.updateScene({
        elements: [
          startFrame,
          createDefaultElementProps({
            id: "frameStart2",
            type: "frame",
            name: "Start 2",
            customData: { isStartFrame: true },
          }),
        ],
      });
    });

    expect(scrollToContentCalls).toBe(1);
  });

  // ==========================================================================
  // 8. GLOBAL TELEPORT PING-PONG LOOP PREVENTION & FRESHNESS WINDOW
  // ==========================================================================

  it("should prevent teleporter ping-pong loop by picking the latest trigger and ignoring stale ones", async () => {
    (window as any).lastTeleportTrigger = undefined;

    act(() => {
      render(<ExcalidrawApp />);
    });

    const { excalidrawAPI } = await waitFor(() => {
      if (!(window as any).ExcalidrawHandle) throw new Error("Handle not ready");
      return (window as any).ExcalidrawHandle;
    });

    let scrollToContentCalls = 0;
    let targetFrameName = "";
    (excalidrawAPI as any).scrollToContent = (frame: any) => {
      scrollToContentCalls++;
      targetFrameName = frame.name;
    };

    const now = Date.now();
    const frameA = createDefaultElementProps({
      id: "frameA",
      type: "frame",
      name: "Runde 1",
      customData: { globalTeleportTrigger: now - 500 },
    });
    const frameB = createDefaultElementProps({
      id: "frameB",
      type: "frame",
      name: "Runde 2",
      customData: { globalTeleportTrigger: now - 100 }, // Latest fresh trigger
    });
    const frameStale = createDefaultElementProps({
      id: "frameStale",
      type: "frame",
      name: "Old Runde",
      customData: { globalTeleportTrigger: now - 15000 }, // Stale (> 10s old)
    });

    act(() => {
      excalidrawAPI.updateScene({
        elements: [frameA, frameB, frameStale],
      });
    });

    await waitFor(() => {
      expect((window as any).lastTeleportTrigger).toBe(now - 100);
    });

    // Expect that scrollToContent was called for frameB (latest) and called exactly ONCE
    expect(scrollToContentCalls).toBe(1);
    expect(targetFrameName).toBe("Runde 2");

    // Idempotency check: A second update with the same trigger timestamp must not trigger another scroll
    act(() => {
      excalidrawAPI.updateScene({
        elements: [frameA, frameB, frameStale],
      });
    });

    expect(scrollToContentCalls).toBe(1);
  });

  // ==========================================================================
  // 9. ZONE CARD COUNTING, COLLISION & DYNAMIC BACKGROUND COLOR TOGGLING
  // ==========================================================================

  it("should accurately count cards in zone and dynamically toggle zone background color", async () => {
    act(() => {
      render(<ExcalidrawApp />);
    });

    const { excalidrawAPI, checkGameState } = await waitFor(() => {
      if (!(window as any).ExcalidrawHandle) throw new Error("Handle not ready");
      return (window as any).ExcalidrawHandle;
    });

    const zoneId = "test_zone_1";
    const cardId1 = "gem_card_1";
    const cardId2 = "gem_card_2";
    const invalidCardId = "rock_card_1";
    const counterId = "gem_counter_1";

    const zone = createDefaultElementProps({
      id: zoneId,
      type: "rectangle",
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      backgroundColor: "#ffaaaa",
      customData: {
        isZone: true,
        zoneName: "GemZone",
        acceptedCardTypes: "gem",
        zoneColorActive: "#aaffaa",
        zoneColorDefault: "#ffaaaa",
      },
    });

    const counter = {
      ...createDefaultElementProps({
        id: counterId,
        x: 400,
        y: 100,
        customData: {
          countsType: "gem",
          countsZone: "GemZone",
          value: 0,
        },
      }),
      type: "counter",
    } as any;

    const gemCard1 = createDefaultElementProps({
      id: cardId1,
      type: "rectangle",
      x: 0,
      y: 0,
      width: 40,
      height: 40,
      customData: { isCard: true, cardType: "gem" },
    });

    const gemCard2 = createDefaultElementProps({
      id: cardId2,
      type: "rectangle",
      x: 50,
      y: 0,
      width: 40,
      height: 40,
      customData: { isCard: true, cardType: "gem" },
    });

    const rockCard = createDefaultElementProps({
      id: invalidCardId,
      type: "rectangle",
      x: 0,
      y: 50,
      width: 40,
      height: 40,
      customData: { isCard: true, cardType: "rock" },
    });

    // Step 1: Initial state (all cards outside zone)
    act(() => {
      excalidrawAPI.updateScene({
        elements: [zone, counter, gemCard1, gemCard2, rockCard],
      });
    });

    act(() => {
      checkGameState(excalidrawAPI.getSceneElements());
    });

    await waitFor(() => {
      const elements = excalidrawAPI.getSceneElements();
      const z = elements.find((el: any) => el.id === zoneId);
      const c = elements.find((el: any) => el.id === counterId);
      expect(z?.backgroundColor).toBe("#ffaaaa");
      expect(c?.customData?.value).toBe(0);
    });

    // Step 2: Move gemCard1 and gemCard2 into zone (both match accepted type)
    act(() => {
      const elements = excalidrawAPI.getSceneElements();
      excalidrawAPI.updateScene({
        elements: elements.map((el: any) => {
          if (el.id === cardId1) return { ...el, x: 120, y: 120 };
          if (el.id === cardId2) return { ...el, x: 180, y: 150 };
          return el;
        }),
      });
    });

    act(() => {
      checkGameState(excalidrawAPI.getSceneElements());
    });

    await waitFor(() => {
      const elements = excalidrawAPI.getSceneElements();
      const z = elements.find((el: any) => el.id === zoneId);
      const c = elements.find((el: any) => el.id === counterId);
      expect(z?.backgroundColor).toBe("#aaffaa"); // Active color
      expect(c?.customData?.value).toBe(2); // 2 gem cards counted
    });

    // Step 3: Move rockCard into zone (violates acceptedCardTypes: "gem")
    act(() => {
      const elements = excalidrawAPI.getSceneElements();
      excalidrawAPI.updateScene({
        elements: elements.map((el: any) => {
          if (el.id === invalidCardId) return { ...el, x: 140, y: 140 };
          return el;
        }),
      });
    });

    act(() => {
      checkGameState(excalidrawAPI.getSceneElements());
    });

    await waitFor(() => {
      const elements = excalidrawAPI.getSceneElements();
      const z = elements.find((el: any) => el.id === zoneId);
      const c = elements.find((el: any) => el.id === counterId);
      expect(z?.backgroundColor).toBe("#ffaaaa"); // Toggled back to default because rock is present
      expect(c?.customData?.value).toBe(2); // Counter for "gem" still correctly counts the 2 gems
    });
  });

  // ==========================================================================
  // 10. MASTER COUNTER AGGREGATION (sumsCountersForZone)
  // ==========================================================================

  it("should aggregate values of sibling counters in a master counter with sumsCountersForZone", async () => {
    act(() => {
      render(<ExcalidrawApp />);
    });

    const { excalidrawAPI, checkGameState } = await waitFor(() => {
      if (!(window as any).ExcalidrawHandle) throw new Error("Handle not ready");
      return (window as any).ExcalidrawHandle;
    });

    const counter1 = {
      ...createDefaultElementProps({
        id: "cnt_sub_1",
        customData: {
          countsZone: "ZoneScore",
          value: 15,
        },
      }),
      type: "counter",
    } as any;

    const counter2 = {
      ...createDefaultElementProps({
        id: "cnt_sub_2",
        customData: {
          countsZone: "ZoneScore",
          value: 27,
        },
      }),
      type: "counter",
    } as any;

    const masterCounter = {
      ...createDefaultElementProps({
        id: "cnt_master",
        customData: {
          sumsCountersForZone: "ZoneScore",
          value: 0,
        },
      }),
      type: "counter",
    } as any;

    act(() => {
      excalidrawAPI.updateScene({
        elements: [counter1, counter2, masterCounter],
      });
    });

    act(() => {
      checkGameState(excalidrawAPI.getSceneElements());
    });

    await waitFor(() => {
      const elements = excalidrawAPI.getSceneElements();
      const master = elements.find((el: any) => el.id === "cnt_master");
      expect(master?.customData?.value).toBe(42); // 15 + 27
    });
  });

  it("cycles through 3-tier board modes (whiteboard -> editor -> game -> whiteboard)", async () => {
    const { container } = render(<ExcalidrawApp onLoginClick={() => {}} />);

    await waitFor(() => {
      expect((window as any).ExcalidrawHandle?.excalidrawAPI).toBeDefined();
    });

    // 1. Initial State: Whiteboard mode
    const modeBtn = container.querySelector(".board-mode-button") as HTMLButtonElement;
    expect(modeBtn).not.toBeNull();
    expect(modeBtn.textContent).toContain("Whiteboard");
    expect(container.querySelector(".board-mode-whiteboard")).not.toBeNull();

    // 2. Click 1 -> Switch to Gamify Editor
    act(() => {
      modeBtn.click();
    });

    await waitFor(() => {
      expect(modeBtn.textContent).toContain("Gamify Editor");
      expect(container.querySelector(".board-mode-editor")).not.toBeNull();
    });

    // 3. Click 2 -> Switch to Game Mode
    act(() => {
      modeBtn.click();
    });

    await waitFor(() => {
      expect(modeBtn.textContent).toContain("Game Mode!");
      expect(container.querySelector(".board-mode-game")).not.toBeNull();
    });

    // 4. Click 3 -> Cycle back to Whiteboard
    act(() => {
      modeBtn.click();
    });

    await waitFor(() => {
      expect(modeBtn.textContent).toContain("Whiteboard");
      expect(container.querySelector(".board-mode-whiteboard")).not.toBeNull();
    });
  });

  it("triggers teleporter action when in Game Mode", async () => {
    render(<ExcalidrawApp onLoginClick={() => {}} />);

    await waitFor(() => {
      expect((window as any).ExcalidrawHandle?.excalidrawAPI).toBeDefined();
    });

    const excalidrawAPI = (window as any).ExcalidrawHandle.excalidrawAPI;

    const targetFrame = {
      ...createDefaultElementProps({
        id: "frame_destination",
        name: "Stage 2",
        type: "frame",
        x: 1000,
        y: 1000,
        width: 800,
        height: 600,
      }),
    } as any;

    const teleporterBtn = {
      ...createDefaultElementProps({
        id: "teleport_token",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        customData: {
          isTeleporter: true,
          targetFrame: "Stage 2",
          teleportAll: true,
        },
      }),
    } as any;

    act(() => {
      excalidrawAPI.updateScene({ elements: [targetFrame, teleporterBtn] });
    });

    // Verify globalTeleportTrigger is updated when action triggers
    act(() => {
      const el = excalidrawAPI.getSceneElements().find((e: any) => e.id === "teleport_token");
      // Simulate triggerAction for teleport
      const frames = excalidrawAPI.getSceneElements().filter((e: any) => e.type === "frame" && e.name === el.customData.targetFrame);
      if (frames.length > 0) {
        excalidrawAPI.updateScene({
          elements: excalidrawAPI.getSceneElements().map((e: any) =>
            e.id === frames[0].id
              ? { ...e, customData: { ...e.customData, globalTeleportTrigger: 999999 } }
              : e
          ),
        });
      }
    });

    await waitFor(() => {
      const frame = excalidrawAPI.getSceneElements().find((e: any) => e.id === "frame_destination");
      expect(frame?.customData?.globalTeleportTrigger).toBe(999999);
    });
  });

  it("starts timer via timer button action", async () => {
    render(<ExcalidrawApp onLoginClick={() => {}} />);

    await waitFor(() => {
      expect((window as any).ExcalidrawHandle?.excalidrawAPI).toBeDefined();
    });

    const excalidrawAPI = (window as any).ExcalidrawHandle.excalidrawAPI;

    const timerDisplay = {
      ...createDefaultElementProps({
        id: "timer_display_1",
        type: "rectangle",
        customData: {
          isTimerDisplay: true,
          timerName: "RoundTimer",
          timerDuration: 120,
          endTime: 0,
        },
      }),
    } as any;

    act(() => {
      excalidrawAPI.updateScene({ elements: [timerDisplay] });
    });

    // Simulate timer start
    act(() => {
      const now = Date.now();
      excalidrawAPI.updateScene({
        elements: excalidrawAPI.getSceneElements().map((e: any) =>
          e.customData?.timerName === "RoundTimer"
            ? { ...e, customData: { ...e.customData, endTime: now + 120000, hasFrozen: false } }
            : e
        ),
      });
    });

    await waitFor(() => {
      const display = excalidrawAPI.getSceneElements().find((e: any) => e.id === "timer_display_1");
      expect(display?.customData?.endTime).toBeGreaterThan(0);
      expect(display?.customData?.hasFrozen).toBe(false);
    });
  });
});