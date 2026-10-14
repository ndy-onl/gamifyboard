# GamifyBoard Architektur- und Entwicklerdokumentation

Dieses Dokument dient als Referenz für Entwickler und KI-Agenten, die am GamifyBoard-Frontend arbeiten. Es erklärt die Kernmechanismen, Synchronisationen und Edge-Case-Behandlungen.

---

## 1. Übersicht der GamifyBoard-Spezifika

GamifyBoard erweitert das Standard-Excalidraw um interaktive Spiel-Elemente:
1. **PlayerSlots & Cursor-Synchronisation**: Verknüpfung von Namen auf dem Board mit dem Multiplayer-Cursor.
2. **Timer & Counter**: Dynamisch herunterzählende Zeitgeber und Zähler auf Zonen.
3. **Teleport & Start-Frames**: Automatisches Fokussieren des Viewports auf Startbereiche oder bei globalen Teleport-Triggern.
4. **Karten (Cards) & Zonen (Zones)**: Spielkarten, die in Zonen platziert und nach Zeitablauf eingefroren werden können.

---

## 2. PlayerSlots: Synchronisation & "Source of Truth"

### Problembeschreibung (Historischer Bug)
* Auf dem Board gibt es mehrere verknüpfte Slots mit derselben `customData.playerSlotId` (z. B. auf einem Spielertableau und auf Spielfiguren).
* Ändert ein Spieler den Text eines Slots (z. B. von „Player 2“ auf „Adrian“), klickt er anschließend ins Leere (`blur`).
* Wenn zuvor stur nach `slot.version` entschieden wurde, hat ein anderer verknüpfter Slot (der noch „Player 2“ hieß, aber z. B. durch Verschieben eine höhere Versionsnummer hatte) den gerade eingetippten Namen wieder überschrieben.

### Implementierte Lösung in `excalidraw-app/App.tsx` (`checkGameState`)
1. **Erkennung des aktiven Slots (`isSlotActive`)**:
   * Prüft nicht nur `appState.selectedElementIds`, sondern explizit `appState.editingTextElement` (in Excalidraw heißt das aktive Texteingabefeld so!).
2. **Priorität 1 (Aktiv editiert)**:
   * Ein Slot, der gerade ausgewählt oder im WYSIWYG-Editor editiert wird, überschreibt bedingungslos alle anderen Slots und wird als `latestPlayerSlots[slotId]` (Source of Truth) gesetzt.
3. **Priorität 2 (Grace-Period nach Blur / Deselektion)**:
   * Über `lastActiveSlotElementId` und `lastActiveSlotTimestamp` bleibt der gerade editierte Slot für **10 Sekunden** die Source of Truth, selbst wenn nach dem Klick ins Leere kurzzeitig kein Element selektiert ist.
4. **Synchronisation aller verknüpften Slots**:
   * Alle anderen Slots mit der gleichen `playerSlotId` werden aktualisiert und erhalten:
     ```ts
     version: Math.max((el.version || 0), (truthSlot.version || 0)) + 1
     ```
     Dies stellt sicher, dass die Änderung über Yjs an alle Mitspieler verteilt wird.
5. **Cursor-Name**:
   * Der Cursor-Name des Benutzers wird via `setCursorName(mySlot.text)` (Yjs Awareness) sofort auf den neuen Spielernamen gesetzt.

---

## 3. Globaler Timer: Dynamisches Countdown-Rendering

### Problemstellung
* Der Timer sendet nicht jede Sekunde ein Yjs-Scene-Update, um unnötigen Netzwerkverkehr bei mehreren Spielern zu vermeiden.
* Die Restzeit wird beim Zeichnen dynamisch berechnet (`renderElement.ts`: `remaining = endTime - Date.now()`).
* **Achtung**: `excalidrawAPI.refresh()` aktualisiert nur DOM/Canvas-Offsets (Breite/Höhe), löst aber kein Neuzeichnen der Canvas-Elemente aus.

### Implementierte Lösung
* Im 1-Sekunden-Intervall in `excalidraw-app/App.tsx` wird bei aktiven Timern `(excalidrawAPI as any).triggerRender(true)` aufgerufen.
* Dies erzwingt ein Re-Rendering des Canvas, wodurch die Zahl auf dem Timer-Display flüssig herunterzählt.

---

## 4. Docker- & Build-Umgebung (Coolify / Staging)

* **Node Version**: Node 20 (`node:20-alpine`) ist zwingend erforderlich (einige neuere Upstream-Pakete wie `brace-expansion@5` verlangen Node >= 20).
* **Build-Reihenfolge**:
  1. `yarn install --frozen-lockfile`
  2. `yarn build:packages` (baut `@excalidraw/excalidraw` und Typen)
  3. `cd excalidraw-app && yarn install --frozen-lockfile && yarn build:app && yarn build:version`
* **Translations**: Neue Übersetzungsschlüssel müssen in `packages/excalidraw/locales/en.json` gepflegt werden, da TypeScript die Typen daraus generiert.
