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
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

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

describe("Adversarial Challenger Edge Cases", () => {
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
  // CHALLENGE 1: 10-SECOND BLUR GRACE PERIOD DYNAMICS & EXPIRATION BOUNDARY
  // ==========================================================================

  describe("1. PlayerSlot 10s Grace Period Boundary Verification", () => {
    it("protects slot within 10s, but allows higher remote version to take precedence after 10s expires", async () => {
      act(() => {
        render(<ExcalidrawApp />);
      });

      const { excalidrawAPI, checkGameState } = await waitFor(() => {
        if (!(window as any).ExcalidrawHandle) throw new Error("Handle not ready");
        return (window as any).ExcalidrawHandle;
      });

      const slotLocal = createTextElementProps({
        id: "slot_local_adv",
        text: "Local Hero",
        originalText: "Local Hero",
        version: 10,
        customData: { isPlayerSlot: true, playerSlotId: "p_grace_test" },
      });

      const slotRemote = createTextElementProps({
        id: "slot_remote_adv",
        text: "Remote Stale",
        originalText: "Remote Stale",
        version: 5,
        customData: { isPlayerSlot: true, playerSlotId: "p_grace_test" },
      });

      // 1. Local user actively edits slotLocal
      act(() => {
        excalidrawAPI.updateScene({
          elements: [slotLocal, slotRemote],
          appState: {
            editingTextElement: slotLocal as any,
            selectedElementIds: { [slotLocal.id]: true },
          },
        });
      });

      act(() => {
        checkGameState(excalidrawAPI.getSceneElements());
      });

      // 2. User blurs: editingTextElement cleared
      act(() => {
        excalidrawAPI.updateScene({
          appState: {
            editingTextElement: null,
            selectedElementIds: {},
          },
        });
      });

      // 3. Within grace period (< 10s): Incoming remote packet with high version v100
      act(() => {
        excalidrawAPI.updateScene({
          elements: [
            createTextElementProps({
              id: "slot_remote_adv",
              text: "Stale Remote Attack",
              originalText: "Stale Remote Attack",
              version: 100,
              customData: { isPlayerSlot: true, playerSlotId: "p_grace_test" },
            }),
            createTextElementProps({
              id: "slot_local_adv",
              text: "Local Hero",
              originalText: "Local Hero",
              version: 10,
              customData: { isPlayerSlot: true, playerSlotId: "p_grace_test" },
            }),
          ],
        });
      });

      act(() => {
        checkGameState(excalidrawAPI.getSceneElements());
      });

      // Local slot must override remote slot because Date.now() is within 10s
      let elements = excalidrawAPI.getSceneElements();
      let sRemote = elements.find((el: any) => el.id === "slot_remote_adv");
      expect(sRemote?.text).toBe("Local Hero");
      expect(sRemote?.version).toBe(101); // Math.max(100, 10) + 1

      // 4. Now simulate passage of time past 10 seconds:
      // Mock Date.now to be 11,000ms in the future
      const realDateNow = Date.now;
      try {
        const futureTime = realDateNow() + 12000;
        vi.spyOn(Date, "now").mockReturnValue(futureTime);

        // A legitimate higher-version remote update arrives after grace period expires
        act(() => {
          excalidrawAPI.updateScene({
            elements: [
              createTextElementProps({
                id: "slot_remote_adv",
                text: "Legitimate Remote Winner",
                originalText: "Legitimate Remote Winner",
                version: 200,
                customData: { isPlayerSlot: true, playerSlotId: "p_grace_test" },
              }),
              createTextElementProps({
                id: "slot_local_adv",
                text: "Local Hero",
                originalText: "Local Hero",
                version: 101,
                customData: { isPlayerSlot: true, playerSlotId: "p_grace_test" },
              }),
            ],
          });
        });

        act(() => {
          checkGameState(excalidrawAPI.getSceneElements());
        });

        // After grace period expiration, Tier 3 applies: highest version (v200) wins!
        elements = excalidrawAPI.getSceneElements();
        const sLocal = elements.find((el: any) => el.id === "slot_local_adv");
        sRemote = elements.find((el: any) => el.id === "slot_remote_adv");
        expect(sLocal?.text).toBe("Legitimate Remote Winner");
        expect(sRemote?.text).toBe("Legitimate Remote Winner");
        expect(sLocal?.version).toBe(201); // Math.max(101, 200) + 1
      } finally {
        vi.spyOn(Date, "now").mockImplementation(realDateNow);
      }
    });
  });

  // ==========================================================================
  // CHALLENGE 2: START FRAME TELEPORTATION LATCHING & ANTI-PING-PONG STRESS
  // ==========================================================================

  describe("2. Start Frame Teleportation Latching & Camera Ping-Pong Stress", () => {
    it("latches initial teleport and does not scroll on 10 rapid scene updates", async () => {
      (window as any).hasInitialTeleported = false;

      act(() => {
        render(<ExcalidrawApp />);
      });

      const { excalidrawAPI } = await waitFor(() => {
        if (!(window as any).ExcalidrawHandle) throw new Error("Handle not ready");
        return (window as any).ExcalidrawHandle;
      });

      let scrollToCalls = 0;
      (excalidrawAPI as any).scrollToContent = vi.fn(() => {
        scrollToCalls++;
      });

      const startFrame = createDefaultElementProps({
        id: "frame_start_stress",
        type: "frame",
        name: "Start Base",
        customData: { isStartFrame: true },
      });

      // 1. Initial scene load with start frame
      act(() => {
        excalidrawAPI.updateScene({
          elements: [startFrame],
        });
      });

      await waitFor(() => {
        expect(scrollToCalls).toBe(1);
        expect((window as any).hasInitialTeleported).toBe(true);
      });

      // 2. Perform 10 rapid subsequent scene updates (moving elements, adding shapes)
      for (let i = 0; i < 10; i++) {
        act(() => {
          excalidrawAPI.updateScene({
            elements: [
              startFrame,
              createDefaultElementProps({
                id: `elem_${i}`,
                x: i * 50,
                y: i * 50,
              }),
            ],
          });
        });
      }

      // Assert scrollToContent was NEVER called again
      expect(scrollToCalls).toBe(1);
    });

    it("prevents global teleporter ping-pong across 10 repeated updates with identical trigger", async () => {
      (window as any).lastTeleportTrigger = undefined;

      act(() => {
        render(<ExcalidrawApp />);
      });

      const { excalidrawAPI } = await waitFor(() => {
        if (!(window as any).ExcalidrawHandle) throw new Error("Handle not ready");
        return (window as any).ExcalidrawHandle;
      });

      let scrollToCalls = 0;
      (excalidrawAPI as any).scrollToContent = vi.fn(() => {
        scrollToCalls++;
      });

      const triggerTime = Date.now() - 200; // Fresh (< 10s)
      const teleFrame = createDefaultElementProps({
        id: "tele_frame_stress",
        type: "frame",
        name: "Arena",
        customData: { globalTeleportTrigger: triggerTime },
      });

      // Initial update with teleport trigger
      act(() => {
        excalidrawAPI.updateScene({
          elements: [teleFrame],
        });
      });

      await waitFor(() => {
        expect(scrollToCalls).toBe(1);
        expect((window as any).lastTeleportTrigger).toBe(triggerTime);
      });

      // 10 subsequent updates with the same trigger timestamp
      for (let i = 0; i < 10; i++) {
        act(() => {
          excalidrawAPI.updateScene({
            elements: [teleFrame],
          });
        });
      }

      // Must remain exactly 1 call (no ping-pong loop)
      expect(scrollToCalls).toBe(1);
    });

    it("ignores global teleport triggers older than 10 seconds", async () => {
      (window as any).lastTeleportTrigger = undefined;

      act(() => {
        render(<ExcalidrawApp />);
      });

      const { excalidrawAPI } = await waitFor(() => {
        if (!(window as any).ExcalidrawHandle) throw new Error("Handle not ready");
        return (window as any).ExcalidrawHandle;
      });

      const scrollToSpy = vi.fn();
      (excalidrawAPI as any).scrollToContent = scrollToSpy;

      const staleTime = Date.now() - 15000; // 15s ago (> 10s)
      const staleTeleFrame = createDefaultElementProps({
        id: "tele_frame_stale",
        type: "frame",
        name: "Old Arena",
        customData: { globalTeleportTrigger: staleTime },
      });

      act(() => {
        excalidrawAPI.updateScene({
          elements: [staleTeleFrame],
        });
      });

      // Should not set lastTeleportTrigger and should not scroll
      expect(scrollToSpy).not.toHaveBeenCalled();
      expect((window as any).lastTeleportTrigger).toBeUndefined();
    });
  });

  // ==========================================================================
  // CHALLENGE 3: ZONE CARD COUNTING BOUNDARY PRECISION & EXCLUSION RULES
  // ==========================================================================

  describe("3. Zone Card Counting Boundary & Exclusion Verification", () => {
    it("precisely excludes cards touching bounding box edges and includes cards with 1px overlap", async () => {
      act(() => {
        render(<ExcalidrawApp />);
      });

      const { excalidrawAPI, checkGameState } = await waitFor(() => {
        if (!(window as any).ExcalidrawHandle) throw new Error("Handle not ready");
        return (window as any).ExcalidrawHandle;
      });

      // Zone: [100, 100, 200, 200] => spans x: [100, 300], y: [100, 300]
      const zone = createDefaultElementProps({
        id: "boundary_zone",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        customData: {
          isZone: true,
          zoneName: "BoundaryZone",
          acceptedCardTypes: "gem",
        },
      });

      const counter = {
        ...createDefaultElementProps({
          id: "boundary_counter",
          customData: {
            countsType: "gem",
            countsZone: "BoundaryZone",
            value: 0,
          },
        }),
        type: "counter",
      } as any;

      // Card touching Left edge from outside: x + w = 80 + 20 = 100 (zone.x)
      const cardTouchLeft = createDefaultElementProps({
        id: "c_touch_left",
        x: 80,
        y: 150,
        width: 20,
        height: 20,
        customData: { isCard: true, cardType: "gem" },
      });

      // Card touching Right edge from outside: x = 300 (zone.x + zone.w)
      const cardTouchRight = createDefaultElementProps({
        id: "c_touch_right",
        x: 300,
        y: 150,
        width: 20,
        height: 20,
        customData: { isCard: true, cardType: "gem" },
      });

      // Card touching Top edge from outside: y + h = 80 + 20 = 100 (zone.y)
      const cardTouchTop = createDefaultElementProps({
        id: "c_touch_top",
        x: 150,
        y: 80,
        width: 20,
        height: 20,
        customData: { isCard: true, cardType: "gem" },
      });

      // Card touching Bottom edge from outside: y = 300 (zone.y + zone.h)
      const cardTouchBottom = createDefaultElementProps({
        id: "c_touch_bottom",
        x: 150,
        y: 300,
        width: 20,
        height: 20,
        customData: { isCard: true, cardType: "gem" },
      });

      act(() => {
        excalidrawAPI.updateScene({
          elements: [zone, counter, cardTouchLeft, cardTouchRight, cardTouchTop, cardTouchBottom],
        });
      });

      act(() => {
        checkGameState(excalidrawAPI.getSceneElements());
      });

      // Test 3A: All 4 touching cards must be EXCLUDED (count = 0)
      await waitFor(() => {
        const elements = excalidrawAPI.getSceneElements();
        const cnt = elements.find((el: any) => el.id === "boundary_counter");
        expect(cnt?.customData?.value).toBe(0);
      });

      // Test 3B: Shift each card 1 pixel inside the zone bounding box
      // Left: x=81, width=20 => right edge = 101 > 100
      // Right: x=299, width=20 => left edge = 299 < 300
      // Top: y=81, height=20 => bottom edge = 101 > 100
      // Bottom: y=299, height=20 => top edge = 299 < 300
      act(() => {
        const elements = excalidrawAPI.getSceneElements();
        excalidrawAPI.updateScene({
          elements: elements.map((el: any) => {
            if (el.id === "c_touch_left") return { ...el, x: 81 };
            if (el.id === "c_touch_right") return { ...el, x: 299 };
            if (el.id === "c_touch_top") return { ...el, y: 81 };
            if (el.id === "c_touch_bottom") return { ...el, y: 299 };
            return el;
          }),
        });
      });

      act(() => {
        checkGameState(excalidrawAPI.getSceneElements());
      });

      // All 4 cards now overlap by 1px -> count must be 4
      await waitFor(() => {
        const elements = excalidrawAPI.getSceneElements();
        const cnt = elements.find((el: any) => el.id === "boundary_counter");
        expect(cnt?.customData?.value).toBe(4);
      });
    });

    it("ignores non-card elements even if they are inside the zone and have matching cardType", async () => {
      act(() => {
        render(<ExcalidrawApp />);
      });

      const { excalidrawAPI, checkGameState } = await waitFor(() => {
        if (!(window as any).ExcalidrawHandle) throw new Error("Handle not ready");
        return (window as any).ExcalidrawHandle;
      });

      const zone = createDefaultElementProps({
        id: "filter_zone",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        customData: {
          isZone: true,
          zoneName: "FilterZone",
          acceptedCardTypes: "token",
        },
      });

      const counter = {
        ...createDefaultElementProps({
          id: "filter_counter",
          customData: {
            countsType: "token",
            countsZone: "FilterZone",
            value: 0,
          },
        }),
        type: "counter",
      } as any;

      // Inside zone, has cardType: "token", but isCard is NOT true
      const nonCardElement = createDefaultElementProps({
        id: "non_card_inside",
        x: 150,
        y: 150,
        width: 30,
        height: 30,
        customData: { isCard: false, cardType: "token" },
      });

      // Inside zone, has isCard: true, cardType: "token"
      const genuineCard = createDefaultElementProps({
        id: "genuine_card_inside",
        x: 180,
        y: 180,
        width: 30,
        height: 30,
        customData: { isCard: true, cardType: "token" },
      });

      act(() => {
        excalidrawAPI.updateScene({
          elements: [zone, counter, nonCardElement, genuineCard],
        });
      });

      act(() => {
        checkGameState(excalidrawAPI.getSceneElements());
      });

      await waitFor(() => {
        const elements = excalidrawAPI.getSceneElements();
        const cnt = elements.find((el: any) => el.id === "filter_counter");
        // Only genuineCard is counted; nonCardElement is ignored!
        expect(cnt?.customData?.value).toBe(1);
      });
    });
  });
});
