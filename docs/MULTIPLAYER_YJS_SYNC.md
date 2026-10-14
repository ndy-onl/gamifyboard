# GamifyBoard Multiplayer & Yjs Synchronisations-Guide

Dieses Dokument erläutert die Echtzeit-Architektur, das Zusammenspiel mit dem NestJS-Backend, die CRDT-Datenstrukturen von Yjs und das Cursorsharing via Awareness.

---

## 1. Systemarchitektur Übersicht

```
[Browser / Excalidraw]
         ▲
         │ (Elemente, Assets, AppState)
         ▼
[y-excalidraw Binding]
         ▲
         │ (Y.Doc: elements Y.Map, assets Y.Map)
         ▼
[WebSocket Provider]
         ▲
         │ WSS (Binary Protocol)
         ▼
[NestJS Backend (Gateway)] ◄──► [Redis Pub/Sub] ◄──► [PostgreSQL (Persistenz)]
```

---

## 2. Kernkomponenten

### 2.1 Das Y.Doc Datenmodell
Im Yjs-Dokument (`Y.Doc`) werden zwei Hauptstrukturen verwaltet:
1. `elements` (`Y.Map<string, ExcalidrawElement>`):
   * Jeder Key ist die `element.id`.
   * Elemente werden als CRDT synchronisiert. Bei Versionskonflikten gewinnt die höhere Versionsnummer bzw. die Lamport-Clock von Yjs.
2. `assets` (`Y.Map<string, BinaryFileData>`):
   * Bilder und externe Dateien.
   * Bilder werden in S3 / SeaweedFS gespeichert; im Y.Doc liegt die Metainformation inklusive Download-URL.

### 2.2 Collaboration Awareness (Cursor & Präsenz)
Yjs Awareness überträgt flüchtige Zustände (ephemeral state), die nicht in der Datenbank gespeichert werden müssen:
* **Cursor-Koordinaten**: `x, y` auf der Canvas-Bühne.
* **Benutzername**: `user.name` (wird automatisch mit dem aktuellen Player-Slot synchronisiert).
* **Farbe**: `user.color` (Farbe des Cursors und des Namens-Badges).

```ts
// Beispiel Awareness Update:
awareness.setLocalStateField("user", {
  name: "Adrian",
  color: "#ff4444",
  avatarUrl: "...",
});
```

---

## 3. Wichtige Regeln zur Vermeidung von Bugs

### 3.1 Keine Netzwerk-Überflutung (Flooding)
* **Timer**: Dynamische Countdowns dürfen **niemals** jede Sekunde ein Element-Update über Yjs senden. Das flutet den WebSocket und führt bei vielen Clients zu Verbindungsabbrüchen. Countdowns berechnen ihre Zeit lokal und nutzen `triggerRender(true)`.
* **Mausbewegungen**: Werden gedrosselt (throttled) über Awareness übertragen, nicht als Scene-Update.

### 3.2 Transaktionen nutzen
Wenn mehrere Elemente gleichzeitig verändert werden (z. B. beim Initialisieren eines Spielfelds oder beim Verlinken mehrerer Player-Slots):
```ts
doc.transact(() => {
  // Alle Änderungen hier bündeln
});
```
Dadurch wird nur eine einzige Netzwerk-Nachricht gesendet.

### 3.3 Bild-Uploads & S3
* Bilder werden nicht als Base64 im JSON abgespeichert.
* Das Frontend lädt Bilder direkt über presigned S3 URLs hoch und speichert im Element nur die File-ID und Bild-Referenz.

---

## 4. Checkliste für KI-Agenten bei Multiplayer-Problemen

1. **Cursor-Name stimmt nicht?**
   * Prüfen, ob `localUserPlayerSlotId` gesetzt ist.
   * Sicherstellen, dass `awareness.setLocalStateField("user", ...)` aufgerufen wird.
2. **Elemente springen zurück?**
   * Prüfen, ob `version` erhöht wurde: `version: (el.version || 0) + 1`.
   * Prüfen, ob ein anderer Client stur nach einer veralteten Source of Truth überschreibt.
3. **Verbindung bricht ab?**
   * Prüfen, ob ein endloser Render-Loop oder Intervall-Loop `excalidrawAPI.updateScene()` spammt.
