# GamifyBoard Multiplayer & Yjs Synchronization Specification

## 1. Client-Server Architecture & Topology

GamifyBoard utilizes an enterprise real-time collaboration topology built on top of Yjs, Socket.IO, NestJS, Redis, and PostgreSQL. The architecture guarantees sub-50ms peer-to-peer visual latency, resilient offline reconnection, and scalable state persistence.

```
+----------------------------------------------------------------------------------------------------+
|                                           Browser Client                                           |
|                                                                                                    |
|  +---------------------------+       +-----------------------------+       +--------------------+  |
|  |     Excalidraw Canvas     | <---> | @ndy-onl/y-excalidraw       | <---> |    Y.Doc Engine    |  |
|  | (Static & Interactive UI) |       | (Patched Live Drag Binding) |       | (CRDT Data Model)  |  |
|  +---------------------------+       +-----------------------------+       +--------------------+  |
|                                                                                      |             |
|                                                                                      v             |
|                                                                            +--------------------+  |
|                                                                            |    y-socket.io     |  |
|                                                                            |     Provider       |  |
|                                                                            +--------------------+  |
+--------------------------------------------------------------------------------------|-------------+
                                                                                       |
                                                            WebSocket (WSS Binary)     |
                                                            Socket.IO Wire Protocol    v
+----------------------------------------------------------------------------------------------------+
|                                    NestJS Collaboration Gateway                                    |
|                                                                                                    |
|  +---------------------------------------------------+       +----------------------------------+  |
|  |                Room Connection Manager            | <---> |       S3 Presign Controller      |  |
|  |  - JWT Authentication validation                  |       |  - Generates upload PUT URLs     |  |
|  |  - Room-level membership authorization            |       |  - CDN asset offload redirects   |  |
|  +---------------------------------------------------+       +----------------------------------+  |
|                           |                                                                        |
|                           v                                                                        v
|  +---------------------------------------------------+                         +----------------+  |
|  |            Redis Pub/Sub & State Cache            |                         | S3 / SeaweedFS |  |
|  |  - Multi-node horizontal message broadcasting     |                         | Object Storage |  |
|  |  - Active room presence cache                     |                         +----------------+  |
|  +---------------------------------------------------+                                            |
|                           |                                                                        |
|                           v                                                                        |
|  +---------------------------------------------------+                                             |
|  |          PostgreSQL Database Persistence          |                                             |
|  |  - Boards (elements_json, app_state, version)     |                                             |
|  |  - User profiles & Workspace team access          |                                             |
|  +---------------------------------------------------+                                             |
+----------------------------------------------------------------------------------------------------+
```

### 1.1 Data Flow Sequence
1. **User Interaction**: A user edits an element, moves a card, or adjusts a counter.
2. **Local Canvas Immediate Update**: Excalidraw updates local state synchronously for instantaneous feedback (60 FPS).
3. **CRDT Translation**: `@ndy-onl/y-excalidraw` computes delta operations and writes changes into `Y.Doc`.
4. **Transport**: `y-socket.io` serializes Yjs update vectors as compact binary packets and transmits them over WebSocket.
5. **Gateway & Fan-Out**: The NestJS gateway receives updates, validates authentication, broadcasts to other room members via Redis Pub/Sub, and schedules debounced snapshots to PostgreSQL.
6. **Remote Reconciliation**: Remote clients receive the binary delta, apply it to their local `Y.Doc`, and trigger `ExcalidrawBinding._remoteElementsChangeHandler` to update their canvas scene.

---

## 2. Y.Doc Internal Structure

The root `Y.Doc` instance encapsulates three shared CRDT data structures:

```ts
const ydoc = new Y.Doc();

// 1. Elements Collection
const yElements = ydoc.getArray<Y.Map<any>>("elements");

// 2. Binary File & Image Assets
const yAssets = ydoc.getMap<any>("assets");

// 3. Room-Wide Engine & Game Mode State
const gamifyState = ydoc.getMap<any>("gamifyState");
```

### 2.1 `elements` (`Y.Array<Y.Map<any>>`)
- Stores the collection of scene elements. Each element is represented as an independent `Y.Map` inside a shared `Y.Array`.
- Key/value pairs within each element's `Y.Map` map directly to `ExcalidrawElement` properties (`id`, `type`, `x`, `y`, `width`, `height`, `text`, `version`, `customData`, etc.).
- Fine-grained property diffing ensures that moving an element concurrently while another user edits its text or `customData` resolves cleanly without overwriting the entire element.

### 2.2 `assets` (`Y.Map<string, BinaryFileData>`)
- Keyed by `FileId` (`op.id`).
- Stores asset metadata, MIME types, and public CDN download URLs.
- Large base64 binary strings are intercepted and offloaded to S3 (see Section 5), preventing document bloat.

### 2.3 `gamifyState` (`Y.Map<any>`)
- Stores collaborative room-level parameters:
  - `isEditMode`: `boolean` — Controls whether participants are in Edit Mode or Play Mode.
  - `activeRound`: `number` — Current board phase.
- Observed via `gamifyState.observe(event => { ... })` to synchronize UI toolbar state across all participants.

---

## 3. Awareness Protocol & Dynamic Cursor Name Binding

Multiplayer presence, cursor pointers, and user identity are managed through the ephemeral **Yjs Awareness Protocol**. Unlike document elements, awareness state is transient, exists only in memory, and does not write to the database.

### 3.1 Awareness State Structure
```ts
interface LocalAwarenessUser {
  name: string;        // Active display name
  color: string;       // Assigned user color hex (e.g., "#3b82f6")
  avatarUrl?: string;  // Optional user avatar
}

interface LocalAwarenessState {
  user: LocalAwarenessUser;
  pointer?: { x: number; y: number };
  button?: "up" | "down";
}
```

### 3.2 Dynamic Cursor Name Binding
In GamifyBoard, a player's cursor name is dynamically bound to their active PlayerSlot. When a user edits a player slot on the canvas:

```
  User edits text in PlayerSlot (e.g. "Adrian")
                       |
                       v
       onChange in excalidraw-app/App.tsx
                       |
                       v
        Detects activeText.id === slot.id
                       |
                       v
         setCursorName("Adrian") called
                       |
                       v
  useCollaboration.ts updates Awareness State:
  awareness.setLocalStateField("user", { ...user, name: "Adrian" })
                       |
                       v
  Ephemeral WebSocket broadcast to all connected room clients
                       |
                       v
  Remote clients re-render cursor tag with name "Adrian"
```

Implementation in `excalidraw-app/hooks/useCollaboration.ts`:
```ts
const setCursorName = useCallback((name: string) => {
  if (providerRef.current) {
    const state = providerRef.current.awareness.getLocalState();
    const user = state ? state.user : null;
    if (user && user.name !== name) {
      providerRef.current.awareness.setLocalStateField("user", {
        ...user,
        name,
      });
    }
  }
}, []);
```

---

## 4. Live Dragging Delta Synchronization

In upstream `@ndy-onl/y-excalidraw`, element synchronizations were gated behind:
```js
state.cursorButton === "up"
```
This restriction meant element moves were only broadcast **after** the user released their mouse button, causing other players to see shapes suddenly jump or teleport across the board with zero animation.

### 4.1 The Live Dragging Patch (`patch-y-excalidraw.sh`)
GamifyBoard applies a targeted postinstall patch to `@ndy-onl/y-excalidraw` to unlock real-time dragging deltas:

1. **Remove Mouse-Up Restriction**:
   Stripped `state.cursorButton === "up" &&` from the `onChange` handler.
2. **Hook `onPointerUpdate`**:
   During active pointer movement, the binding inspects current elements against `lastKnownElements`:
   ```ts
   this.onPointerUpdate = (payload) => {
     if (this.awareness) {
       this.awareness.setLocalStateField("pointer", payload.pointer);
       this.awareness.setLocalStateField("button", payload.button);
     }
     if (this.api && this.yElements) {
       // getSceneElementsIncludingDeleted matches onChange to prevent length oscillation
       const elements = this.api.getSceneElementsIncludingDeleted();
       if (!areElementsSame(this.lastKnownElements, elements)) {
         const res = getDeltaOperationsForElements(this.lastKnownElements, elements);
         if (res.operations.length > 0) {
           this.lastKnownElements = res.lastKnownElements;
           applyElementOperations(this.yElements, res.operations, this);
         }
       }
     }
   };
   ```
3. **Transaction Origin Tagging**:
   Updates triggered locally pass `this` as the transaction origin:
   ```ts
   if (this.yElements.doc) {
     this.yElements.doc.transact(() => {
       applyElementOperations(this.yElements, operations, this);
     }, this);
   }
   ```
4. **Echo Suppression**:
   The remote change receiver checks `txn.origin === this` and skips local re-application:
   ```ts
   this._remoteElementsChangeHandler = (event, txn) => {
     if (txn.origin === this) {
       return;
     }
     const elements = yjsToExcalidraw(this.yElements);
     this.lastKnownElements = elements;
     this.api.updateScene({ elements });
   };
   ```

---

## 5. S3 & SeaweedFS Binary Asset Offload

### 5.1 The Base64 Bloat Problem
When users drop images onto Excalidraw, the default behavior converts files into base64 `dataURL` strings (often 2MB–10MB per image). Storing base64 strings directly in Yjs documents causes:
- Massive memory bloat in the CRDT document history.
- WebSocket frame fragmentation and disconnection errors.
- Slow document initial load times for new participants.

### 5.2 The Presigned Upload Pipeline
GamifyBoard intercepts image additions at the Yjs binding layer (`patch-y-excalidraw.sh`):

```
User pastes/drops image
         |
         v
Excalidraw creates local data:image/... base64 asset
         |
         v
patch-y-excalidraw detects asset.dataURL.startsWith('data:')
         |
         v
1. Immediately set temporary placeholder:
   yAssets.set(op.id, { ...asset, dataURL: '' })  <-- 0 base64 bytes in Y.Doc!
         |
         v
2. Request presigned URL from NestJS backend:
   GET /s3/presign?filename=${asset.id}.${ext}&contentType=${asset.mimeType}
         |
         v
3. Upload binary blob directly to S3 / SeaweedFS via HTTP PUT
         |
         v
4. On upload completion, sync public URL via Yjs:
   yAssets.set(op.id, { ...asset, dataURL: publicUrl })
         |
         v
Remote users receive S3 HTTP URL -> fetch blob -> FileReader -> local canvas
```

### 5.3 Remote Asset Hydration
When remote clients observe an asset where `file.dataURL.startsWith('http')`:
- The client fetches the remote binary blob from S3.
- Reads it into an in-memory dataURL via `FileReader.readAsDataURL(blob)`.
- Calls `this.api.addFiles([{ ...file, dataURL: reader.result }])` so Excalidraw's canvas can render the image texture locally without violating canvas CORS security policies.

---

## 6. Network Anti-Flooding Guarantees

Collaborative applications must protect the network layer from message flooding. GamifyBoard implements four strict anti-flooding guarantees:

### Guarantee 1: Zero-Payload Dynamic Timer Ticks
- **Mechanism**: The 1-second global timer tick in `excalidraw-app/App.tsx` does **not** call `excalidrawAPI.updateScene()`.
- **Execution**: The timer executes locally:
  ```ts
  (excalidrawAPI as any).triggerRender(true);
  ```
- **Network Cost**: **0 bytes**. Each client computes remaining time independently from the synchronized `endTime` epoch timestamp.

### Guarantee 2: Awareness Pointer Throttling
- Mouse pointer coordinates are throttled to 50ms intervals before transmission.
- Awareness messages are transient UDP-like WebSocket packets that do not generate Yjs transactional history.

### Guarantee 3: Transaction Batching
- Multi-element updates (such as updating all sibling player slots or recalculating counters) are batched inside a single `ydoc.transact(() => { ... })` block.
- All modifications are bundled into a single network packet, avoiding multi-message serialization overhead.

### Guarantee 4: State Check Idempotency Guard
- In `checkGameState`, `needsUpdate` defaults to `false`.
- Modifications to element text, counter values, or zone colors are only queued if the new value differs from the current value.
- If no values change, `updateScene` is never called.

---

## 7. CRDT Conflict Resolution Rules

GamifyBoard reconciles state using Yjs's distributed CRDT algorithms combined with custom semantic tie-breakers:

| Interaction Scenario | Conflict Resolution Mechanism |
|---|---|
| **Concurrent Property Edits** (e.g., Player A changes stroke color while Player B resizes width) | **Per-Property LWW (Last-Write-Wins)**: Both edits succeed without clobbering each other because attributes are separate keys in the element's `Y.Map`. |
| **Concurrent Move vs Move** (Two players drag the same card simultaneously) | **Yjs Lamport Clock + ClientID**: The transaction with the higher Lamport timestamp wins; ties are deterministically broken by the higher numerical `clientID`. |
| **Active Player Slot vs Sibling Slot** | **WYSIWYG Priority Overrides Version**: The actively edited slot (`editingTextElement`) is enforced as source-of-truth. Sibling slots adopt `version = max(sibling.version, truth.version) + 1` to supersede any stale versions in remote CRDT stores. |
| **Zone Card Validation** | **Deterministic Functional Evaluation**: Zone color is a pure function of intersecting card types. All clients calculate the exact same color state from synchronized coordinates. |
| **Simultaneous Teleport Triggers** | **Highest Timestamp with Anti-Ping-Pong Guard**: If two teleporters trigger concurrently, the engine selects the one with the highest `globalTeleportTrigger` within a 10s window and locks camera oscillation via `lastTeleportTrigger`. |
