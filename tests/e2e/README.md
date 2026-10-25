# GamifyBoard Test Suite & Load Test Runner

Diese Test-Suite überprüft die Funktionalität, Synchronisation und Ausfallsicherheit von GamifyBoard unter extremen Bedingungen.

## Verfügbare Test-Kommandos

Im Verzeichnis `/srv/gamifyboard-ecosystem/test-browser`:

### 1. Schneller visueller Check & Link-Verifikation
```bash
npm run test:visual
```
* Prüft alle Workshop-Boards (Look-'n'-Feel, Mind Maps).
* Erstellt Screenshots aller Boards im Browser.

### 2. Standard Interaktions-Test (Klicken & Draggen)
```bash
npm run test:drag
```
* Simuliert Klicks und Verschieben von Elementen auf dem Canvas.

### 3. Edge-Cases & Netzwerk-Fluktuation
```bash
npm run test:edge
```
* Testet Offline-/Online-Wechsel, Reconnects und verzögerte WebSockets.

---

## Erweiterte Belastungs- & Stresstests (Neu aufgenommen)

### 4. Paralleler 50-Teilnehmer Lasttest
```bash
npm run test:load
```
* **Was wird getestet:** 50 gleichzeitige Teilnehmer (10 pro Board über 5 Boards).
* **Geräte:** Desktop (1080p), MacBook Air, Compact Laptops, iPad Pro Tablets.
* **Netzwerke:** Schnelles WLAN, normales WLAN, 4G, gedrosseltes Campus-Netz mit Ping-Latenz.
* **Ergebnis:** Screenshots aller 50 Clients in `/srv/gamifyboard-ecosystem/load_test_results/`.

### 5. Paralleler Drag-&-Drop Chaos-Test
```bash
npm run test:chaos
```
* **Was wird getestet:** 50 Teilnehmer greifen gleichzeitig Schriftelemente und Bildkarten, ziehen sie wild über das Board und testen Kollisions-/Yjs-Synchronisations-Belastbarkeit.
* **Ergebnis:** 50 Screenshots in `/srv/gamifyboard-ecosystem/load_test_results/drag_chaos/`.

### 6. 10 Mbit/s Server-Bottleneck Stresstest
```bash
npm run test:bottleneck
```
* **Was wird getestet:** Drosselt den gesamten Produktionsserver auf Betriebssystem-Ebene (`tc`) auf **10 Mbit/s**.
* Alle 50 Teilnehmer greifen gleichzeitig über diese Nadelöhr-Leitung auf 5 Boards zu.
* Nach dem Test wird die Bandbreitenbeschränkung automatisch wieder aufgehoben.
* **Ergebnis:** Screenshots in `/srv/gamifyboard-ecosystem/load_test_results/server_throttled_10mbit/`.
