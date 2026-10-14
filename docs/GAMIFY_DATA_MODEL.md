# GamifyBoard Data Model Specification (`customData`)

## 1. Overview & Data Model Architecture

GamifyBoard extends the standard Excalidraw element data structure via the native `customData: Record<string, any>` dictionary attached to each `ExcalidrawElement`. By preserving Excalidraw's core schema, GamifyBoard elements retain full backward compatibility with native drawing tools, selection mechanics, grouping, undo/redo stacks, and clipboard serialization, while embedding rich tabletop game semantics.

All persistent element state modifications are tracked by Yjs CRDTs and broadcast over WebSocket connections. To ensure conflict-free convergence across distributed clients, all mutations must strictly observe the **Data Invariants** detailed in Section 4.

---

## 2. Element Classifications & Field Specifications

### 2.1 Cards (`isCard`)
Cards are movable tokens or playing cards representing game assets, inventory items, characters, or resources. Cards interact with Zones via AABB spatial collision detection and can be automatically locked when game timers expire.

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `isCard` | `boolean` | **Yes** | `false` | Primary discriminator flag identifying the element as a playable card. |
| `cardType` | `string` | **Yes** | `""` | Categorical classification string (e.g., `"worker"`, `"resource"`, `"gold"`, `"task"`). Used by Zones and Counters to filter and evaluate cards. |
| `locked` | `boolean` | Optional | `false` | Native Excalidraw property. Set to `true` when a countdown timer reaches zero, preventing players from moving or interacting with the card until the timer is reset or started. |

#### Example Card Element:
```json
{
  "id": "card_worker_01",
  "type": "rectangle",
  "x": 320,
  "y": 180,
  "width": 120,
  "height": 160,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "#ffd700",
  "locked": false,
  "version": 14,
  "customData": {
    "isCard": true,
    "cardType": "worker"
  }
}
```

---

### 2.2 Zones (`isZone`)
Zones are spatial boundaries (typically rectangles or frames) on the board where cards are placed, sorted, or scored. The game engine continuously evaluates whether cards intersecting the zone match the zone's acceptance criteria, dynamically altering the zone's background color.

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `isZone` | `boolean` | **Yes** | `false` | Primary discriminator flag identifying the element as a drop zone. |
| `zoneName` | `string` | Optional | `""` | Unique or categorical identifier for the zone (e.g., `"Player1Hand"`, `"Bank"`, `"Discard"`). Counters target this name to filter counted cards. |
| `acceptedCardTypes` | `string` | **Yes** | `""` | Comma-separated list of card types permitted in this zone (e.g., `"worker,tool"`). Empty strings or whitespace are ignored. |
| `zoneColorDefault` | `string` | Optional | `"#ffaaaa"` | Hex or CSS color string rendered when the zone is empty or contains any invalid card. |
| `zoneColorActive` | `string` | Optional | `"#aaffaa"` | Hex or CSS color string rendered when the zone contains at least one card and **all** contained cards match `acceptedCardTypes`. |

#### Collision & Validation Logic:
```ts
const acceptedTypes = (el.customData.acceptedCardTypes || "")
  .split(",")
  .filter(Boolean);

const cardsInZone = cards.filter((card) => isIntersecting(card, el as any));

const isCorrect =
  cardsInZone.length > 0 &&
  cardsInZone.every((card) =>
    acceptedTypes.includes(card.customData?.cardType)
  );

const newBackgroundColor = isCorrect
  ? el.customData?.zoneColorActive || "#aaffaa"
  : el.customData?.zoneColorDefault || "#ffaaaa";
```

#### Example Zone Element:
```json
{
  "id": "zone_worksite_01",
  "type": "rectangle",
  "x": 600,
  "y": 150,
  "width": 300,
  "height": 220,
  "strokeColor": "#333333",
  "backgroundColor": "#ffaaaa",
  "version": 22,
  "customData": {
    "isZone": true,
    "zoneName": "Worksite",
    "acceptedCardTypes": "worker,tool",
    "zoneColorDefault": "#ffaaaa",
    "zoneColorActive": "#aaffaa"
  }
}
```

---

### 2.3 Counters (`type: "counter"` or `isCounter`)
Counters display dynamic integer values rendered with centered typography (`0.6 * height`). Counters function in two modes:
1. **Zone Card Counter**: Automatically tallies cards of a specific `cardType` resting inside a target zone.
2. **Master Aggregator**: Automatically sums values of other sibling counters associated with a zone group.

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `isCounter` | `boolean` | Optional | `false` | Discriminator flag. Standard counter elements also have native `type === "counter"`. |
| `value` | `number` | **Yes** | `0` | Current integer value displayed on the canvas. |
| `countsZone` | `string` | Optional | `""` | Target zone name or group association (e.g., `"Player1"`). In zone counting mode, limits card evaluation to this zone. In master aggregation mode, groups this counter under that zone. |
| `countsType` | `string` | Optional | `""` | Specific `cardType` to count inside the target zone. Disables manual increment/decrement buttons in UI. |
| `sumsCountersForZone` | `string` | Optional | `""` | Master Aggregator flag. If populated, this counter calculates `sum(other.value)` for all other counters sharing `countsZone === sumsCountersForZone`. |

#### Example Counter Element:
```json
{
  "id": "counter_gold_01",
  "type": "counter",
  "x": 950,
  "y": 150,
  "width": 80,
  "height": 50,
  "strokeColor": "#000000",
  "backgroundColor": "#e3f2fd",
  "version": 8,
  "customData": {
    "isCounter": true,
    "value": 3,
    "countsZone": "Worksite",
    "countsType": "worker"
  }
}
```

---

### 2.4 Player Slots (`isPlayerSlot`)
Player slots link multiple text labels and tokens across the canvas to a single player identity (e.g., dashboard nameplate, meeples, score trackers). Editing any linked slot synchronizes all instances and immediately binds the user's multiplayer awareness cursor name.

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `isPlayerSlot` | `boolean` | **Yes** | `false` | Primary discriminator flag identifying the element or its parent container as a player identity slot. |
| `playerSlotId` | `string` | **Yes** | `""` | Shared identifier linking instances together (e.g., `"player-1"`, `"player-2"`, `"blue-team"`). |

#### Container Inheritance:
If a text element lacks `isPlayerSlot` directly but has a `containerId` pointing to an element with `customData.isPlayerSlot === true` and `customData.playerSlotId`, the text element automatically inherits the identity.

#### Example Player Slot Element:
```json
{
  "id": "text_slot_p1_dashboard",
  "type": "text",
  "x": 100,
  "y": 80,
  "width": 140,
  "height": 30,
  "text": "Alice",
  "originalText": "Alice",
  "fontSize": 20,
  "version": 42,
  "customData": {
    "isPlayerSlot": true,
    "playerSlotId": "player-1"
  }
}
```

---

### 2.5 Countdown Timers (`isTimerDisplay`)
Timer displays render countdown clocks directly onto canvas shapes (`rectangle`, `ellipse`, `diamond`). The timer computes remaining seconds on every repaint without broadcasting per-second scene updates across the network.

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `isTimerDisplay` | `boolean` | **Yes** | `false` | Primary discriminator flag marking the shape as a dynamic countdown display. |
| `timerName` | `string` | **Yes** | `""` | Unique identifier targeting this timer from Timer Buttons (e.g., `"RoundTimer"`, `"SpeedChallenge"`). |
| `timerDuration` | `number` | **Yes** | `300` | Duration of the countdown in seconds. |
| `endTime` | `number` | **Yes** | `0` | Epoch timestamp in milliseconds when the countdown reaches 0 (`Date.now() + timerDuration * 1000`). If `0`, timer is stopped or reset. |
| `hasFrozen` | `boolean` | Optional | `false` | Single-shot latch. Set to `true` exactly once when `remaining === 0` to trigger card locking (`locked = true`) and toast notification without repeating every second. |
| `timeText` | `string` | Optional | `""` | Cached formatted string (e.g., `"05:00"`). |

#### Canvas Display Calculation:
```ts
const remaining = element.customData?.endTime
  ? Math.max(0, Math.ceil((element.customData.endTime - Date.now()) / 1000))
  : (element.customData?.timerDuration || 300);

const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
const secs = (remaining % 60).toString().padStart(2, '0');
const text = `${mins}:${secs}`;
```

#### Example Timer Display Element:
```json
{
  "id": "timer_main_round",
  "type": "rectangle",
  "x": 500,
  "y": 50,
  "width": 160,
  "height": 60,
  "strokeColor": "#c92a2a",
  "backgroundColor": "#ffe3e3",
  "version": 10,
  "customData": {
    "isTimerDisplay": true,
    "timerName": "RoundTimer",
    "timerDuration": 180,
    "endTime": 1728924300000,
    "hasFrozen": false
  }
}
```

---

### 2.6 Timer Controller Buttons (`isTimerButton`)
Interactive buttons clicked in Play Mode to control an associated `isTimerDisplay`.

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `isTimerButton` | `boolean` | **Yes** | `false` | Discriminator flag marking the element as an interactive timer controller. |
| `targetTimerName` | `string` | **Yes** | `""` | Name matching the `timerName` of the target `isTimerDisplay`. |
| `timerAction` | `"start" \| "reset"` | **Yes** | `"start"` | Action to perform on click. `"start"` initializes `endTime` and unlocks cards. `"reset"` clears `endTime: 0` and unlocks cards. |

---

### 2.7 Teleporter Buttons (`isTeleporter`)
Interactive buttons clicked in Play Mode to navigate or jump players across the canvas.

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `isTeleporter` | `boolean` | **Yes** | `false` | Discriminator flag marking the element as an interactive teleporter trigger. |
| `targetFrame` | `string` | **Yes** | `""` | The `name` attribute of the target `frame` element. |
| `teleportAll` | `boolean` | Optional | `false` | If `true`, clicking broadcasts a `globalTeleportTrigger` timestamp on the target frame, moving all connected players. If `false`, scrolls only the local player's viewport. |

---

### 2.8 Frames: Start Viewport & Global Teleport (`isStartFrame`, `globalTeleportTrigger`)
Excalidraw frames with specialized Gamify attributes for initial camera positioning and synchronized multiplayer teleportation.

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `isStartFrame` | `boolean` | Optional | `false` | Placed on a `type === "frame"` element. When the board loads, clients automatically autofocus and zoom to this frame. |
| `globalTeleportTrigger` | `number` | Optional | `0` | Epoch timestamp in milliseconds. When set or updated, all clients connected to the room smoothly animate their camera to this frame. Protected by an anti-ping-pong latch. |

---

## 3. Formal TypeScript Interfaces & Schemas

```ts
/**
 * Core discriminated union for GamifyBoard customData specifications.
 */
export type GamifyCustomData =
  | CardCustomData
  | ZoneCustomData
  | CounterCustomData
  | PlayerSlotCustomData
  | TimerDisplayCustomData
  | TimerButtonCustomData
  | TeleporterCustomData
  | FrameCustomData
  | StandardCustomData;

export interface StandardCustomData {
  [key: string]: any;
}

export interface CardCustomData {
  isCard: true;
  cardType: string;
  [key: string]: any;
}

export interface ZoneCustomData {
  isZone: true;
  zoneName?: string;
  acceptedCardTypes: string;
  zoneColorDefault?: string;
  zoneColorActive?: string;
  [key: string]: any;
}

export interface CounterCustomData {
  isCounter?: boolean;
  value: number;
  countsZone?: string;
  countsType?: string;
  sumsCountersForZone?: string;
  [key: string]: any;
}

export interface PlayerSlotCustomData {
  isPlayerSlot: true;
  playerSlotId: string;
  [key: string]: any;
}

export interface TimerDisplayCustomData {
  isTimerDisplay: true;
  timerName: string;
  timerDuration: number;
  endTime: number;
  hasFrozen?: boolean;
  timeText?: string;
  [key: string]: any;
}

export interface TimerButtonCustomData {
  isTimerButton: true;
  targetTimerName: string;
  timerAction: "start" | "reset";
  [key: string]: any;
}

export interface TeleporterCustomData {
  isTeleporter: true;
  targetFrame: string;
  teleportAll?: boolean;
  [key: string]: any;
}

export interface FrameCustomData {
  isStartFrame?: boolean;
  globalTeleportTrigger?: number;
  [key: string]: any;
}
```

### 3.1 JSON Schema Definition

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "GamifyCustomData",
  "type": "object",
  "properties": {
    "isCard": { "type": "boolean" },
    "cardType": { "type": "string" },
    "isZone": { "type": "boolean" },
    "zoneName": { "type": "string" },
    "acceptedCardTypes": { "type": "string" },
    "zoneColorDefault": { "type": "string", "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$" },
    "zoneColorActive": { "type": "string", "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$" },
    "isPlayerSlot": { "type": "boolean" },
    "playerSlotId": { "type": "string" },
    "isCounter": { "type": "boolean" },
    "value": { "type": "integer" },
    "countsZone": { "type": "string" },
    "countsType": { "type": "string" },
    "sumsCountersForZone": { "type": "string" },
    "isTimerDisplay": { "type": "boolean" },
    "timerName": { "type": "string" },
    "timerDuration": { "type": "integer", "minimum": 1 },
    "endTime": { "type": "integer", "minimum": 0 },
    "hasFrozen": { "type": "boolean" },
    "timeText": { "type": "string" },
    "isTimerButton": { "type": "boolean" },
    "targetTimerName": { "type": "string" },
    "timerAction": { "type": "string", "enum": ["start", "reset"] },
    "isTeleporter": { "type": "boolean" },
    "targetFrame": { "type": "string" },
    "teleportAll": { "type": "boolean" },
    "isStartFrame": { "type": "boolean" },
    "globalTeleportTrigger": { "type": "integer", "minimum": 0 }
  }
}
```

---

## 4. Fundamental Data Invariants

All code modules and AI agents modifying GamifyBoard scenes must enforce the following invariants:

### Invariant 1: Structural Immutability
Never mutate `element` or `element.customData` in place. Excalidraw's change-detection mechanisms, Jotai atoms, and Yjs delta diffing rely on object reference changes.
```ts
// CORRECT:
const updatedElement = {
  ...element,
  customData: {
    ...element.customData,
    value: newValue,
  },
  version: (element.version || 0) + 1,
};

// INCORRECT (Breaks change detection & Yjs sync):
element.customData.value = newValue;
```

### Invariant 2: Monotonic Version Increments
Every modification to an element or its `customData` must increment `version`:
```ts
version: (element.version || 0) + 1
```
For synchronized sibling slots (where an older version might exist on remote clients):
```ts
version: Math.max((element.version || 0), (truthSlot.version || 0)) + 1
```
Failing to increment `version` will cause Yjs reconciliation (`reconcileElements`) to discard the modification in favor of remote peer states.

### Invariant 3: Container Inheritance via `containerId`
When evaluating bound text elements (e.g., text inside a rectangle or shape):
- If the text element has `containerId`, its identity can be resolved through its container element.
- If the container element defines `isPlayerSlot` and `playerSlotId`, the child text element inherits those properties.
- `isSlotActive` checks selection and text editing across both the text element and its parent container.

### Invariant 4: Guarded Idempotency & Minimal Update Principle
`checkGameState` must only trigger `excalidrawAPI.updateScene` when a property has actually changed (`needsUpdate = true`). Unconditional calls to `updateScene` generate continuous network updates, overloading the WebSocket connection and causing UI stuttering.
