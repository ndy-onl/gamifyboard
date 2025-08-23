# Handoff: Umstellung auf privaten und umbenannten y-excalidraw Fork

**Strategische Entscheidung:** Wir verwenden ab sofort unseren eigenen privaten und umbenannten Fork von `y-excalidraw`. Der neue Paketname ist `@ndy-onl/y-excalidraw`.

**Begründung:**
1.  **Klarheit & Wartbarkeit:** Der Paketname entspricht nun der Quelle, was Verwechslungen vorbeugt.
2.  **Sicherheit:** Der Code wurde von uns einer grundlegenden Sicherheitsanalyse unterzogen. Wir haben keine schadhaften Muster gefunden.
3.  **Stabilität:** Wir haben bekannte Schwachstellen in den Abhängigkeiten behoben und haben die volle Kontrolle über zukünftige Änderungen.

---

## Anweisungen für den Frontend-Agenten

Deine Aufgabe ist es, das Refactoring von `App.tsx` abzuschließen und die Umstellung auf das umbenannte Paket vollständig zu integrieren.

### Schritt 1: Abhängigkeiten überprüfen

Die `package.json` im `gamifyboard-app`-Verzeichnis wurde bereits aktualisiert. Stelle sicher, dass sie die folgende Abhängigkeit enthält:

```json
"dependencies": {
  ...
  "@ndy-onl/y-excalidraw": "github:ndy-onl/y-excalidraw"
  ...
}
```

Führe `yarn install` im Hauptverzeichnis aus, falls noch nicht geschehen.

### Schritt 2: Import-Pfade im Code aktualisieren (WICHTIG)

Da das Paket umbenannt wurde, müssen alle `import`-Anweisungen im gesamten Frontend-Code, die sich auf das alte Paket beziehen, aktualisiert werden.

**Suche nach:**
`import ... from "@mizuka-wu/y-excalidraw";`

**Ersetze mit:**
`import ... from "@ndy-onl/y-excalidraw";`

Dies betrifft insbesondere die `App.tsx` und potenziell andere Dateien, die Kollaborations-Logik verwenden.

### Schritt 3: `App.tsx` refaktorisieren

Folge den ursprünglichen Anweisungen und baue die `App.tsx`-Komponente so um, dass sie die `ExcalidrawBinding`-Klasse korrekt instanziiert und verwendet (jetzt importiert von `@ndy-onl/y-excalidraw`). Die Referenz-Implementierung aus der allerersten Handoff-Version ist logisch weiterhin gültig, aber der Import-Pfad muss angepasst werden.

### Schritt 4: Verifizierung

Führe nach dem Refactoring `yarn test:typecheck` aus, um sicherzustellen, dass alle Typ-Fehler und Import-Fehler behoben sind.
