# GamifyBoard Datenmodell-Spezifikation (`customData`)

Dieses Dokument beschreibt alle benutzerdefinierten Attribute und Datenstrukturen, die GamifyBoard auf Standard-Excalidraw-Elementen (`ExcalidrawElement.customData`) speichert.

---

## 1. Übersicht

GamifyBoard erweitert Excalidraw-Elemente über das native Feld `customData: Record<string, any>`. Alle kollaborativen Änderungen an diesen Feldern werden über Yjs synchronisiert.

---

## 2. Element-Typen & ihre Attribute

### 2.1 Player-Slots (Spieler-Zuweisung & Cursor)
Player-Slots können eigenständige Textelemente oder Text in Containern (z. B. Rechtecke / Spielfiguren) sein.

| Feld | Typ | Beschreibung |
|---|---|---|
| `isPlayerSlot` | `boolean` | Markiert das Element als Spieler-Slot. |
| `playerSlotId` | `string` | Eindeutige ID des Spieler-Slots (z. B. `"player-1"`, `"player-2"`). Alle Elemente mit derselben ID teilen denselben Spielernamen. |
| `color` | `string` (optional) | Spielerfarbe, die dem Cursor und Board-Markierungen zugeordnet ist. |

#### Verknüpfung & Synchronisation:
* Befindet sich der Text in einem Container (`el.containerId`), kann `isPlayerSlot` und `playerSlotId` entweder auf dem Textelement oder auf dem Container liegen.
* In `checkGameState` werden alle Elemente mit gleicher `playerSlotId` auf denselben Text synchronisiert.
* **Wichtig:** Aktiv im Text-Editor (`appState.editingTextElement`) bearbeitete Slots haben immer Vorrang vor alten Versionsnummern (`version`).

---

### 2.2 Zähler (Counters)
Zähler repräsentieren Punktestände, Lebenspunkte oder Ressourcen.

| Feld | Typ | Beschreibung |
|---|---|---|
| `isCounter` | `boolean` | Markiert das Element als Zähler (oft vom Typ `counter`). |
| `value` | `number` | Aktueller numerischer Zählerwert. |
| `step` | `number` (optional) | Schrittweite für Inkrement/Dekrement (Standard: `1`). |
| `countsZone` | `string` (optional) | ID einer Zone, zu der dieser Zähler gehört. |
| `sumsCountersForZone` | `string` (optional) | Wenn gesetzt, summiert dieser Master-Counter automatisch alle Zähler in der angegebenen Zone. |

---

### 2.3 Spielkarten (Cards)
Karten können auf dem Spielfeld bewegt, umgedreht oder in Zonen platziert werden.

| Feld | Typ | Beschreibung |
|---|---|---|
| `isCard` | `boolean` | Markiert das Element als Spielkarte. |
| `cardId` | `string` | Eindeutige Kennung des Kartentyps. |
| `isFlipped` | `boolean` | `true`, wenn die Karte mit der Rückseite nach oben liegt. |
| `frontImage` / `backImage` | `string` (URL) | Bild-URLs für Vorder- und Rückseite (gespeichert via S3 / SeaweedFS). |
| `locked` | `boolean` | Wenn `true`, kann die Karte nicht mehr bewegt werden (z. B. nach Ablauf eines Spiel-Timers). |

---

### 2.4 Zonen (Zones)
Zonen sind abgegrenzte Spielfeldbereiche (z. B. Ablagestapel, Spielerbereiche, Punktezonen).

| Feld | Typ | Beschreibung |
|---|---|---|
| `isZone` | `boolean` | Markiert das Element (meist Rechteck oder Frame) als Zone. |
| `zoneId` | `string` | Eindeutige ID der Zone. |
| `zoneType` | `string` | Zonentyp (z. B. `"hand"`, `"deck"`, `"scoring"`, `"discard"`). |
| `ownerSlotId` | `string` (optional) | `playerSlotId` des Spielers, dem diese Zone gehört. |

---

### 2.5 Timer & Countdown
Timer steuern Spielrunden und Zeitlimits.

| Feld | Typ | Beschreibung |
|---|---|---|
| `isTimer` | `boolean` | Markiert das Element als Timer. |
| `duration` | `number` | Gesamtdauer in Sekunden. |
| `endTime` | `number` (Timestamp) | Unix-Timestamp (ms), wann der Timer abläuft (`endTime = startTime + duration * 1000`). |
| `isRunning` | `boolean` | Ob der Timer aktiv herunterzählt. |
| `freezeCardsOnZero` | `boolean` (optional) | Wenn `true`, werden bei Erreichen von `0` alle Karten auf dem Board automatisch gesperrt (`locked = true`). |

#### Render-Besonderheit:
* Der Timer sendet **keine** Yjs-Updates pro Sekunde.
* Die Restzeit berechnet der Canvas-Renderer in `renderElement.ts`:
  ```ts
  const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  ```
* Das regelmäßige Repaint wird über `triggerRender(true)` im 1s-Intervall in `App.tsx` ausgelöst.

---

### 2.6 Start-Frames & Teleportation
Steuert die Kamera/Viewport-Positionierung der Spieler.

| Feld | Typ | Beschreibung |
|---|---|---|
| `isStartFrame` | `boolean` | Beim ersten Laden fokussiert die Kamera automatisch diesen Frame (`scrollToContent` / `setViewport`). |
| `globalTeleportTrigger` | `number` (Timestamp) | Setzt ein Spielleiter oder Event diesen Timestamp neu, scrollt die Kamera aller verbundenen Spieler auf diesen Frame. |

---

## 3. Best Practices für Entwickler & KI-Agenten

1. **Immer `version` inkrementieren:** Wenn ein `customData`-Feld geändert wird, muss immer auch `version: (el.version || 0) + 1` gesetzt werden, damit Yjs die Änderung als neuer erkennt.
2. **Keine zirkulären Loops in `checkGameState`:** Änderungen nur vornehmen, wenn sich der Wert tatsächlich geändert hat (`needsUpdate = true`).
3. **Immer unveränderliche Updates (Immutable):** Elemente im Map-Aufruf klonen (`{ ...el, customData: { ...el.customData, ... } }`).
