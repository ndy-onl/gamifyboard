# GamifyBoard Architectural Specification & Developer Guide

## 1. System Overview & Architecture

GamifyBoard is a real-time collaborative tabletop and educational game engine built as an extension of the Excalidraw canvas platform and Yjs CRDT (Conflict-free Replicated Data Type) ecosystem. It combines freeform whiteboard capabilities with deterministic board game mechanics, including synchronized player slots, zone-card collision detection, dynamic countdown timers, automated score counters, and collaborative camera teleportation.

```
+-----------------------------------------------------------------------------------+
|                                  Browser Client                                   |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                        ExcalidrawApp (Top-Level Host)                       |  |
|  |  - Global State Providers (Jotai: appJotaiStore, authStatusAtom)            |  |
|  |  - Game State Loop (checkGameState, processSceneElements)                   |  |
|  |  - Dynamic 1s Timer Tick Engine (triggerRender(true))                       |  |
|  |  - Local/Global Action Dispatcher (triggerAction)                           |  |
|  |                                                                             |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |                           ExcalidrawWrapper                           |  |  |
|  |  |  - Scene Persistence & Board Management (loadBoard, createBoard)      |  |  |
|  |  |  - Collaborative Binding Hook (useCollaboration)                      |  |  |
|  |  |  - UI Overlays (GamifyToolbar, PropertiesSidebar, CustomStats)         |  |  |
|  |  |                                                                       |  |  |
|  |  |  +-----------------------------------------------------------------+  |  |  |
|  |  |  |                 <Excalidraw /> Core Component                   |  |  |  |
|  |  |  |  - Static Canvas Pipeline (renderElement.ts, ShapeCache)       |  |  |  |
|  |  |  |  - Interactive Canvas Pipeline (interactiveScene.ts, clients.ts)|  |  |  |
|  |  |  |  - Event Dispatchers (onPointerDown, onPointerUpdate, onChange) |  |  |  |
|  |  |  +-----------------------------------------------------------------+  |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                       |
                       WebSocket (y-socket.io binary protocol)
                                       v
+-----------------------------------------------------------------------------------+
|                        NestJS WebSocket Gateway Server                            |
|                                                                                   |
|  +-------------------------------+             +-------------------------------+  |
|  |        Redis Pub/Sub          |             |     PostgreSQL Persistence    |  |
|  | (Cross-node room broadcasting)|             | (Board metadata, snapshots)   |  |
|  +-------------------------------+             +-------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### 1.1 Component Hierarchy

The frontend architecture follows a strict 3-tier component hierarchy:

1. **`ExcalidrawApp` (`excalidraw-app/App.tsx`)**:
   - The top-level application component wrapping the workspace with Jotai state providers (`appJotaiStore`), error boundaries (`TopErrorBoundary`), and modal dialogs (SaveToPro, Auth, Share).
   - Manages the authoritative game engine loop (`checkGameState`), the imperative interval tick for countdown timers (1000ms loop), and exposes the imperative API handle (`window.ExcalidrawHandle`, `window.ExcalidrawAPI`).
   - Maintains references to `localUserPlayerSlotId`, `lastActiveSlotElementId`, and `lastActiveSlotTimestamp`.

2. **`ExcalidrawWrapper` (`excalidraw-app/App.tsx`)**:
   - Acts as the operational controller bridging Excalidraw's canvas with backend board persistence (`getBoard`, `createBoard`), room authentication tokens, and the real-time collaboration hook `useCollaboration`.
   - Mounts the GamifyBoard toolbars (`GamifyToolbar`), properties sidebar (`PropertiesSidebar`), and custom statistics panel (`CustomStats`).
   - Receives the imperative `excalidrawAPI` instance via callback and routes scene update streams.

3. **`<Excalidraw />` (`packages/excalidraw/components/App.tsx`)**:
   - The core dual-canvas rendering engine maintaining element collections, spatial indexes, zoom/pan transforms, and input dispatchers.
   - Hosts the `StaticCanvas` (for persistent shapes and cached elements) and `InteractiveCanvas` (for collaborator cursors, selection bounds, and drag handles).

---

## 2. Game State Evaluation Loop (`checkGameState`)

The core game logic executes deterministically inside `checkGameState` (`excalidraw-app/App.tsx`). It is triggered on pointer interactions (`onPointerUpdate`), scene transformations (`onChange`), element updates, and test harness hooks.

```
                              checkGameState Invocation
                                         |
                                         v
               +---------------------------------------------------+
               | Phase 1: Player Slot Source-of-Truth Arbitration  |
               | - Check isSlotActive (editingTextElement/selected)|
               | - Fallback to highest version if no active slot   |
               | - Apply 10s Blur Grace Period protection          |
               +---------------------------------------------------+
                                         |
                                         v
               +---------------------------------------------------+
               | Phase 2: Awareness Cursor Synchronization         |
               | - Extract truth name for localUserPlayerSlotId    |
               | - Execute setCursorName (Yjs awareness update)    |
               +---------------------------------------------------+
                                         |
                                         v
               +---------------------------------------------------+
               | Phase 3: Sibling Slot Version & Text Propagation  |
               | - Sibling slots assigned truthSlot.text           |
               | - version = max(sibling.version, truth.version)+1 |
               +---------------------------------------------------+
                                         |
                                         v
               +---------------------------------------------------+
               | Phase 4: Numeric Counter Tally & Aggregation      |
               | - Zone card counting: tally cards matching type   |
               | - Master counter summation: sum sibling counters  |
               +---------------------------------------------------+
                                         |
                                         v
               +---------------------------------------------------+
               | Phase 5: Zone AABB Collision & Color State Check  |
               | - Calculate 2D Axis-Aligned Bounding Box overlap  |
               | - Validate cards against acceptedCardTypes        |
               | - Assign zoneColorActive or zoneColorDefault      |
               +---------------------------------------------------+
                                         |
                                         v
               +---------------------------------------------------+
               | Phase 6: Conditional updateScene Execution        |
               | - Check if needsUpdate is true                    |
               | - Single atomic excalidrawAPI.updateScene() call  |
               +---------------------------------------------------+
```

### 2.1 The 6 Evaluation Phases

#### Phase 1: Player Slot Truth Resolution
The loop iterates over all text elements that possess or inherit a `playerSlotId` (`getPlayerSlotId(el, elements)`).
- For each unique `slotId`, it identifies whether any instance is currently active via `isSlotActive(slot, appState)`.
- If an active slot is found, it is recorded in `activeSlotForSlotId[slotId]`, and the local user's identity is locked to this slot (`localUserPlayerSlotId = slotId; lastActiveSlotElementId = slot.id; lastActiveSlotTimestamp = Date.now()`).
- In the absence of an actively edited slot, `latestPlayerSlots[slotId]` defaults to the slot with the highest numerical `version`.
- Active slots unconditionally override the highest-version slot (`latestPlayerSlots[slotId] = activeSlotForSlotId[slotId]`).
- If an active slot was blurred within the last 10 seconds, the 10-second blur grace period ensures the recently edited slot remains the authoritative truth.

#### Phase 2: Awareness Cursor Synchronization
If `localUserPlayerSlotId` matches an entry in `latestPlayerSlots` and a `setCursorName` callback is provided:
- The authoritative text from `latestPlayerSlots[localUserPlayerSlotId].text` is forwarded to the collaboration awareness layer.
- The user's multiplayer cursor badge immediately displays the new player name across the network.

#### Phase 3: Sibling Slot Version Incrementing
The loop maps over all scene elements. When encountering a text element belonging to a `slotId`:
- It compares the element's text with the authoritative truth (`truthSlot.text`).
- If `el.id !== truthSlot.id` and `el.text !== truthSlot.text`, the sibling must be updated.
- `needsUpdate` is set to `true`.
- The sibling receives:
  ```ts
  {
    ...el,
    text: truthSlot.text,
    originalText: truthSlot.text,
    version: Math.max((el.version || 0), (truthSlot.version || 0)) + 1,
  }
  ```
- *Why `Math.max(...) + 1`?* In Yjs CRDT element reconciliation, elements with higher version numbers win conflicts. If a sibling slot was moved earlier and has `version: 50`, while the edited slot has `version: 10`, setting `version: 11` would cause remote clients to discard the update. Incrementing beyond the maximum known version guarantees deterministic propagation.

#### Phase 4: Numeric Counter Summation & Zone Counting
Elements of `type === "counter"` (or with `customData.isCounter`) are evaluated:
1. **Master Counters (`sumsCountersForZone`)**:
   - Filters other counters on the board where `other.customData?.countsZone === el.customData.sumsCountersForZone`.
   - Aggregates their `customData.value` via `reduce`.
   - If the aggregated sum differs from `el.customData.value`, updates `el.customData.value = sum`, increments `el.version`, and flags `needsUpdate = true`.
2. **Zone Type Counters (`countsType` without `sumsCountersForZone`)**:
   - Identifies the target zone matching `countsZone` (or any zone accepting `countsType`).
   - Filters all cards intersecting the zone (`isIntersecting(card, zone)`) where `card.customData?.cardType === countsType`.
   - If `el.customData.value !== cardsInZone.length`, updates `el.customData.value = cardsInZone.length`, increments `el.version`, and flags `needsUpdate = true`.

#### Phase 5: Zone AABB Collision & Color State Validation
Elements flagged with `customData.isZone` are evaluated against all cards:
- Calculates AABB intersection (`isIntersecting(card, zone)`).
- Checks `acceptedCardTypes`:
  ```ts
  const acceptedTypes = (el.customData.acceptedCardTypes || "").split(",").filter(Boolean);
  const cardsInZone = cards.filter((card) => isIntersecting(card, el as any));
  const isCorrect = cardsInZone.length > 0 && cardsInZone.every((card) =>
    acceptedTypes.includes(card.customData?.cardType)
  );
  ```
- Selects target color: `isCorrect ? (zoneColorActive || "#aaffaa") : (zoneColorDefault || "#ffaaaa")`.
- If `el.backgroundColor !== newBackgroundColor`, updates `backgroundColor`, increments `version`, and flags `needsUpdate = true`.

#### Phase 6: Conditional `updateScene`
- `excalidrawAPI.updateScene` is called **only if** `needsUpdate === true`.
- If no values changed, no scene update is dispatched, preventing infinite render loops and needless CRDT transaction generation.

---

## 3. Active Editing Precedence & Concurrency Protection

### 3.1 The Active Editing Inversion Problem
In collaborative graphic systems, every element has a monotonically increasing `version` counter. When a user drags a card or moves an element, its `version` is incremented.

Consider the following critical failure mode without active editing precedence:
1. Two text slots, `Slot A` (on a player dashboard) and `Slot B` (on a game piece), share `playerSlotId: "p2"`.
2. A player drags `Slot B` across the canvas to reposition it. `Slot B` is now at `version: 45`, with text `"Player 2"`.
3. The player double-clicks `Slot A` (which is at `version: 12`) and types `"Adrian"`.
4. The player clicks outside `Slot A` to blur and commit the edit.
5. If the game engine purely compared version numbers (`45 > 12`), `Slot B` would be selected as the "source of truth", immediately overwriting `"Adrian"` with `"Player 2"`.

### 3.2 The `isSlotActive` Resolution Algorithm
To prevent this, `isSlotActive` explicitly inspects Excalidraw's active editor state:

```ts
const isSlotActive = (slot: any, appState: any) => {
  if (!appState) return false;
  
  // 1. Direct or container selection
  if (appState.selectedElementIds) {
    if (appState.selectedElementIds[slot.id]) return true;
    if (slot.containerId && appState.selectedElementIds[slot.containerId]) return true;
  }
  
  // 2. Active WYSIWYG text editing (in Excalidraw this is appState.editingTextElement)
  const editingEl = appState.editingTextElement || (appState as any).editingElement;
  const editingId = editingEl?.id;
  if (editingId) {
    if (editingId === slot.id) return true;
    if (slot.containerId && (editingId === slot.containerId || editingEl?.containerId === slot.containerId)) {
      return true;
    }
  }
  
  return false;
};
```

### 3.3 The 10-Second Blur Grace Period
When a user clicks outside the text input:
1. An event gap occurs: `editingTextElement` becomes `null`, and `selectedElementIds` becomes empty.
2. During this microsecond-to-millisecond window, an incoming Yjs update or an intermediate pointer event could re-evaluate `checkGameState`.
3. To seal this race window, GamifyBoard records:
   ```ts
   lastActiveSlotElementId = slot.id;
   lastActiveSlotTimestamp = Date.now();
   ```
4. In `checkGameState`:
   ```ts
   if (lastActiveSlotElementId && Date.now() - lastActiveSlotTimestamp < 10000) {
     const recentSlot = playerSlots.find(s => s.id === lastActiveSlotElementId);
     if (recentSlot) {
       const slotId = getPlayerSlotId(recentSlot, elements);
       if (slotId && !activeSlotForSlotId[slotId]) {
         latestPlayerSlots[slotId] = recentSlot;
       }
     }
   }
   ```
5. This guarantees that for **10 seconds** following a blur or deselection event, the recently edited element retains source-of-truth status, successfully propagating its new name to all sibling elements and the user's cursor.

---

## 4. Rendering Pipeline & Anti-Flooding Architecture

Excalidraw maintains two canvas layers stacked on top of each other:
1. **Static Canvas (`StaticCanvas.tsx`)**: Renders all persistent scene shapes, text, images, and paths. Offscreen canvas caching is employed to avoid redrawing static elements during panning and zooming.
2. **Interactive Canvas (`InteractiveCanvas.tsx`)**: Renders transient, high-frequency elements including the selection box, rotation handles, collaborator cursors, and laser pointer trails.

```
+-----------------------------------------------------------------------------------+
|                              Excalidraw Canvas Stack                              |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                       Interactive Canvas (Top Layer)                        |  |
|  |  - Remote Collaborator Pointers & Cursors (renderRemoteCursors)             |  |
|  |  - Active User Selection Boxes, Bounds, and Handles                        |  |
|  |  - Redrawn on every requestAnimationFrame / pointer move                    |  |
|  +-----------------------------------------------------------------------------+  |
|  |                          Static Canvas (Bottom Layer)                       |  |
|  |  - Scene Elements (rectangles, diamonds, cards, zones, text)               |  |
|  |  - Custom Element Drawing (renderElement.ts)                               |  |
|  |  - Static Canvas Shape Cache (ShapeCache / Element Canvas Cache)           |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### 4.1 Static Canvas Rendering (`packages/element/src/renderElement.ts`)
When elements are drawn to the static canvas:
- Standard shapes are generated using RoughJS (`rc.draw(...)`).
- For elements with `customData.isTimerDisplay`:
  ```ts
  if (element.customData?.isTimerDisplay) {
    let text = "";
    if (element.customData?.endTime) {
      const remaining = Math.max(0, Math.ceil((element.customData.endTime - Date.now()) / 1000));
      const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
      const secs = (remaining % 60).toString().padStart(2, '0');
      text = `${mins}:${secs}`;
    } else {
      const duration = element.customData?.timerDuration || 300;
      const mins = Math.floor(duration / 60).toString().padStart(2, '0');
      const secs = (duration % 60).toString().padStart(2, '0');
      text = `${mins}:${secs}`;
    }
    const fontSize = element.height * 0.4;
    context.font = getFontString({ fontSize, fontFamily: 1 });
    context.fillStyle = element.strokeColor;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, element.width / 2, element.height / 2);
  }
  ```
- For elements of `type === "counter"`:
  ```ts
  const value = element.customData?.value ?? 0;
  const fontSize = element.height * 0.6;
  context.font = getFontString({ fontSize, fontFamily: 1 });
  context.fillStyle = element.strokeColor;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(value), element.width / 2, element.height / 2);
  ```
- For elements with `customData.isDice`:
  Physical D6 dice with circular pip dots (1 to 6) are drawn using a 3x3 normalized grid layout (`[-offset, 0, offset]`).
  - Cache bypass is active when `element.customData?.isRolling` is `true` in `generateElementWithCanvas`.
  - In Game Mode (`boardMode === "game"`), clicking the dice on the canvas invokes `triggerAction("rollDice", element)`. This sets `isRolling: true`, rolls a random value (1–6) after 400ms, updates the element scene state, and presents a toast notification.

### 4.2 Cache Invalidation for Dynamic Elements
Excalidraw optimizes performance by caching pre-rendered bitmap representations of elements in offscreen canvas buffers (`generateElementCanvas`).
If an element's attributes (`x, y, width, height, version`) do not change, Excalidraw copies the cached bitmap rather than executing canvas drawing operations.

In `packages/element/src/renderElement.ts` (line 746):
```ts
if (
  !prevElementWithCanvas ||
  Boolean(element.customData?.isTimerDisplay) || // Explicit Cache Bypass!
  shouldRegenerateBecauseZoom ||
  prevElementWithCanvas.theme !== appState.theme ||
  prevElementWithCanvas.imageCrop !== imageCrop ||
  prevElementWithCanvas.containingFrameOpacity !== containingFrameOpacity
) {
  const elementWithCanvas = generateElementCanvas(element, elementsMap, zoom, renderConfig, appState);
  ...
}
```
Because `Boolean(element.customData?.isTimerDisplay)` is checked, timer displays bypass the offscreen bitmap cache and recalculate their formatted countdown time directly against `Date.now()`.

### 4.3 `triggerRender(true)` vs `refresh()`
The 1-second global timer tick in `excalidraw-app/App.tsx` requires redrawing the countdown on canvas.

```ts
// packages/excalidraw/components/App.tsx
public refresh = () => {
  this.setState({ ...this.getCanvasOffsets() });
};

public triggerRender = (force?: boolean) => {
  if (force === true) {
    this.scene.triggerUpdate();
  } else {
    this.setState({});
  }
};
```

| Method | Behavior | Canvas Repaint | Network Overhead |
|---|---|---|---|
| `refresh()` | Calls `getBoundingClientRect()` to update `offsetLeft` and `offsetTop` on window resize. | **NO** | 0 bytes |
| `triggerRender(false)` | Triggers React `setState({})` on container component. | Partial / UI only | 0 bytes |
| `triggerRender(true)` | Calls `this.scene.triggerUpdate()`, invoking Excalidraw's full static canvas redraw pipeline. | **YES** | **0 bytes** (Local only) |
| `updateScene({ elements })` | Mutates scene elements and broadcasts delta updates over Yjs WebSocket. | YES | High (Floods network if called 1/sec) |

Therefore, `(excalidrawAPI as any).triggerRender(true)` is the strictly required method for timer updates, providing fluid visual countdown without network flooding.

### 4.4 Collaborator Cursor Rendering
Collaborator cursors are rendered onto the `InteractiveCanvas` overlay by `renderRemoteCursors` (`packages/excalidraw/clients.ts` called from `packages/excalidraw/renderer/interactiveScene.ts`):
- Pointers are received through Yjs Awareness.
- Cursor color is derived deterministically from the user's socket ID or assigned color (`getClientColor`).
- The pointer displays an arrow shape with a white outline. When `remotePointerButton === "down"`, concentric animated rings render around the pointer tip.
- Below the pointer, a badge displays the collaborator's name (`remotePointerUsernames`), measured and framed within a rounded rectangle (`context.roundRect` or fallback `roundRect`).

---

## 5. Viewport Navigation & Teleportation

GamifyBoard enables both automated initial viewport framing and synchronized multiplayer teleportation across different sections of large game boards.

### 5.1 Start Frame Initial Autofocus (`isStartFrame`)
When a board is loaded:
1. `processSceneElements` searches for an element where `el.type === "frame" && el.customData?.isStartFrame`.
2. To avoid continuous camera repositioning as elements stream in over Yjs, a latch is set: `(window as any).hasInitialTeleported = true`.
3. In browser environments, scrolling is delayed by 500ms to allow fonts and assets to settle; in test environments (`isTestEnv()`), it executes synchronously.
4. Execution calls `excalidrawAPI.scrollToContent(startFrame, { animate: false })` or `excalidrawAPI.setViewport({ target: [startFrame], fit: "contain" })`.
5. A fallback timeout (5000ms after `initialLoadTime`) marks `hasInitialTeleported = true` if no start frame exists.

### 5.2 Global Teleport Trigger (`globalTeleportTrigger`) & Anti-Ping-Pong
Game masters or interactive buttons can initiate a global teleport to transport all connected players to a designated frame:
- The trigger sets `customData.globalTeleportTrigger = Date.now()` on the target frame.
- When `processSceneElements` runs across clients, it filters all frames containing `globalTeleportTrigger`.
- It identifies the most recent frame using `reduce`:
  ```ts
  const latestFrame = triggeredFrames.reduce((prev, current) => {
    return (prev.customData.globalTeleportTrigger > current.customData.globalTeleportTrigger) ? prev : current;
  });
  const triggerTime = latestFrame.customData.globalTeleportTrigger;
  ```
- **Anti-Ping-Pong Loop Protection**:
  To prevent infinite camera bouncing between clients, two guard conditions are enforced:
  1. **Freshness window**: `triggerTime > Date.now() - 10000` (ignores triggers older than 10 seconds).
  2. **Deduplication latch**: `(window as any).lastTeleportTrigger !== triggerTime`.
- If both conditions pass:
  ```ts
  (window as any).lastTeleportTrigger = triggerTime;
  excalidrawAPI.scrollToContent(latestFrame, { animate: true });
  ```

---

## 6. Collaborative Board Modes & Interactions (3-Tier Mode System)

### 6.1 The 3-Tier Board Mode Cycle
GamifyBoard features three operational modes toggled collaboratively across all room participants via the top-right button:
1. **🎨 Whiteboard Mode (`boardMode === "whiteboard"`)**:
   - Standard Excalidraw whiteboard experience.
   - The left authoring tool menu (`.App-menu__left`) is fully visible.
   - The Gamify `PropertiesSidebar` is completely hidden.
2. **🛠️ Gamify Editor Mode (`boardMode === "editor"`)**:
   - Authoring mode for game masters/creators.
   - The left authoring tool menu (`.App-menu__left`) is visible.
   - The Gamify `PropertiesSidebar` appears when shapes are selected to configure Cards, Zones, Counters, Timers, and Teleporters.
3. **🎮 Game Mode (`boardMode === "game"`)**:
   - Clean, distraction-free board game mode.
   - The left Excalidraw toolbar (`.App-menu__left` / `.selected-shape-actions`) is **completely hidden via CSS** (`.excalidraw-app.board-mode-game`).
   - The Gamify `PropertiesSidebar` is hidden.
   - Interactive elements (`isTeleporter`, `isTimerButton`) directly execute their gameplay actions on `onPointerDown`.

### 6.2 Collaborative Mode Synchronization
The board mode is stored inside the Yjs document root under the `gamifyState` map:
```ts
// excalidraw-app/hooks/useCollaboration.ts
const gamifyState = ydoc.getMap<any>('gamifyState');
gamifyState.observe(event => {
  const remoteMode = gamifyState.get('boardMode');
  if (remoteMode && onBoardModeChange) {
    onBoardModeChange(remoteMode);
  } else {
    // Backward compatibility with legacy boolean isEditMode
    const legacyEdit = gamifyState.get('isEditMode');
    if (legacyEdit !== undefined && onBoardModeChange) {
      onBoardModeChange(legacyEdit ? "editor" : "game");
    }
  }
});

const setGlobalBoardMode = (mode: BoardMode) => {
  gamifyState.set('boardMode', mode);
  gamifyState.set('isEditMode', mode !== 'game');
};
```
When any facilitator toggles the mode switch, all clients transition in real time.

### 6.3 Game Mode Button Interactions
In `excalidraw-app/App.tsx`, `<Excalidraw onPointerDown={...} />` intercepts clicks when in Game Mode (`boardMode === "game"`):
- **Teleporter Button (`customData.isTeleporter`)**:
  - Locates the frame named `customData.targetFrame`.
  - If `customData.teleportAll === true`, updates the frame with `globalTeleportTrigger: Date.now()`, synchronizing all players.
  - If `customData.teleportAll === false`, executes a local animated camera scroll for the clicking player only.
- **Timer Button (`customData.isTimerButton`)**:
  - Matches target timer display where `timerName === targetTimerName`.
  - `timerAction === "start"`: Computes `endTime = Date.now() + duration * 1000`, resets `hasFrozen = false`, and unlocks all cards (`locked: false`).
  - `timerAction === "reset"`: Sets `endTime = 0`, resets `hasFrozen = false`, clears `timeText`, and unlocks all cards.
