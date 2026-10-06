import React from "react";
import { useI18n } from "@excalidraw/excalidraw/i18n";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

interface PropertiesSidebarProps {
  elements: NonDeletedExcalidrawElement[];
  onUpdate: (data: any) => void;
  onAction?: (action: string, data?: any) => void;
}

export const PropertiesSidebar: React.FC<PropertiesSidebarProps> = ({
  elements,
  onUpdate,
  onAction,
}) => {
  const { t } = useI18n();
  const element = elements[0];
  if (!element) return null;
  const { customData = {} } = element;

  const handleIncrement = () => {
    onUpdate({ value: (customData.value || 0) + 1 });
  };

  const handleDecrement = () => {
    onUpdate({ value: (customData.value || 0) - 1 });
  };

  const handleElementTypeChange = (type: string) => {
    const base = { isCounter: false, isCard: false, isZone: false, isTimerDisplay: false, isTimerButton: false, isTeleporter: false };
    if (type === "counter") onUpdate({ ...base, isCounter: true });
    else if (type === "card") onUpdate({ ...base, isCard: true });
    else if (type === "zone") onUpdate({ ...base, isZone: true });
    else if (type === "timerDisplay") onUpdate({ ...base, isTimerDisplay: true });
    else if (type === "timerButton") onUpdate({ ...base, isTimerButton: true, timerAction: "start" });
    else if (type === "teleporter") onUpdate({ ...base, isTeleporter: true });
    else onUpdate({ ...base });
  };

  const elementType = customData.isCounter ? "counter"
    : customData.isCard ? "card"
    : customData.isZone ? "zone"
    : customData.isTimerDisplay ? "timerDisplay"
    : customData.isTimerButton ? "timerButton"
    : customData.isTeleporter ? "teleporter"
    : "none";

  return (
    <div className="properties-sidebar">
      <h4>Gamify {elements.length > 1 ? `(${elements.length} ausgewählt)` : ""}</h4>

      <div style={{ marginBottom: "1rem" }}>
        <div>
          <label>
            <input
              type="radio"
              name="elementType"
              value="none"
              checked={elementType === "none"}
              onChange={() => handleElementTypeChange("none")}
            />
            {t("propertiesSidebar.elementType.standard") || "Standard"}
          </label>
        </div>
        <div>
          <label>
            <input
              type="radio"
              name="elementType"
              value="card"
              checked={elementType === "card"}
              onChange={() => handleElementTypeChange("card")}
            />
            {t("propertiesSidebar.elementType.isCard") || "Karte"}
          </label>
        </div>
        <div>
          <label>
            <input
              type="radio"
              name="elementType"
              value="zone"
              checked={elementType === "zone"}
              onChange={() => handleElementTypeChange("zone")}
            />
            {t("propertiesSidebar.elementType.isZone") || "Zone"}
          </label>
        </div>
        <div>
          <label>
            <input
              type="radio"
              name="elementType"
              value="counter"
              checked={elementType === "counter"}
              onChange={() => handleElementTypeChange("counter")}
            />
            {t("propertiesSidebar.elementType.isCounter") || "Counter"}
          </label>
        </div>
        <div>
          <label>
            <input
              type="radio"
              name="elementType"
              value="timerDisplay"
              checked={elementType === "timerDisplay"}
              onChange={() => handleElementTypeChange("timerDisplay")}
            />
            Timer Anzeige
          </label>
        </div>
        <div>
          <label>
            <input
              type="radio"
              name="elementType"
              value="timerButton"
              checked={elementType === "timerButton"}
              onChange={() => handleElementTypeChange("timerButton")}
            />
            Timer Button (Start/Reset)
          </label>
        </div>
        <div>
          <label>
            <input
              type="radio"
              name="elementType"
              value="teleporter"
              checked={elementType === "teleporter"}
              onChange={() => handleElementTypeChange("teleporter")}
            />
            Teleport Button
          </label>
        </div>
      </div>

      {elementType === "counter" && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Zählt in Zone (leer = erste gefundene):
          </label>
          <input
            type="text"
            placeholder="z.B. Spieler1"
            defaultValue={customData.countsZone || ""}
            onChange={(e) => onUpdate({ countsZone: e.target.value })}
            style={{ width: "200px", marginBottom: "0.5rem" }}
          />
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            {t("propertiesSidebar.counter.countsCardType") || "Zählt Karte:"}
          </label>
          <input
            type="text"
            placeholder={t("propertiesSidebar.counter.placeholder") || "Typ"}
            defaultValue={customData.countsType || ""}
            onChange={(e) => onUpdate({ countsType: e.target.value })}
            style={{ width: "200px", marginBottom: "0.5rem" }}
          />
          <p>
            {t("propertiesSidebar.counter.value") || "Wert"}: {customData.value || 0}
          </p>
          <button onClick={handleIncrement} disabled={!!customData.countsType}>
            +
          </button>
          <button onClick={handleDecrement} disabled={!!customData.countsType}>
            -
          </button>
        </div>
      )}

      {elementType === "card" && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            {t("propertiesSidebar.card.cardType") || "Karten-Typ:"}
          </label>
          <input
            type="text"
            placeholder={t("propertiesSidebar.card.placeholder") || "Typ"}
            defaultValue={customData.cardType || ""}
            onChange={(e) => onUpdate({ cardType: e.target.value })}
            style={{ width: "200px" }}
          />
        </div>
      )}

      {elementType === "zone" && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Zonen-Name (für Zähler-Zuweisung):
          </label>
          <input
            type="text"
            placeholder="z.B. Spieler1"
            defaultValue={customData.zoneName || ""}
            onChange={(e) => onUpdate({ zoneName: e.target.value })}
            style={{ width: "200px", marginBottom: "0.5rem" }}
          />
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            {t("propertiesSidebar.zone.acceptedCardTypes") || "Akzeptierte Karten:"}
          </label>
          <input
            type="text"
            placeholder={t("propertiesSidebar.zone.placeholder") || "Typ"}
            defaultValue={customData.acceptedCardTypes || ""}
            onChange={(e) => onUpdate({ acceptedCardTypes: e.target.value })}
            style={{ width: "200px", marginBottom: "0.5rem" }}
          />
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Farbe: Leer / Inaktiv (Hex):
          </label>
          <input
            type="text"
            placeholder="#ffaaaa"
            defaultValue={customData.zoneColorDefault || ""}
            onChange={(e) => onUpdate({ zoneColorDefault: e.target.value })}
            style={{ width: "200px", marginBottom: "0.5rem" }}
          />
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Farbe: Gefüllt / Aktiv (Hex):
          </label>
          <input
            type="text"
            placeholder="#aaffaa"
            defaultValue={customData.zoneColorActive || ""}
            onChange={(e) => onUpdate({ zoneColorActive: e.target.value })}
            style={{ width: "200px" }}
          />
        </div>
      )}

      {elementType === "timerDisplay" && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Timer Name (z.B. "Level1"):
          </label>
          <input
            type="text"
            placeholder="Level1"
            defaultValue={customData.timerName || ""}
            onChange={(e) => onUpdate({ timerName: e.target.value })}
            style={{ width: "200px", marginBottom: "0.5rem" }}
          />
          <label style={{ display: "block", marginBottom: "0.5rem", marginTop: "10px" }}>
            Dauer (Sekunden):
          </label>
          <input
            type="number"
            placeholder="z.B. 300"
            defaultValue={customData.timerDuration || 300}
            onChange={(e) => onUpdate({ timerDuration: parseInt(e.target.value, 10) || 0 })}
            style={{ width: "200px", marginBottom: "0.5rem" }}
          />
        </div>
      )}

      {elementType === "timerButton" && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Ziel-Timer Name (z.B. "Level1"):
          </label>
          <input
            type="text"
            placeholder="Level1"
            defaultValue={customData.targetTimerName || ""}
            onChange={(e) => onUpdate({ targetTimerName: e.target.value })}
            style={{ width: "200px", marginBottom: "0.5rem" }}
          />
          <label style={{ display: "block", marginBottom: "0.5rem", marginTop: "10px" }}>
            Aktion:
          </label>
          <select
            defaultValue={customData.timerAction || "start"}
            onChange={(e) => onUpdate({ timerAction: e.target.value })}
            style={{ width: "200px", marginBottom: "0.5rem" }}
          >
            <option value="start">Start</option>
            <option value="reset">Reset</option>
          </select>
        </div>
      )}

      {elementType === "teleporter" && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Ziel-Frame Name (z.B. Runde 2):
          </label>
          <input
            type="text"
            placeholder="Name des Frames"
            defaultValue={customData.targetFrame || ""}
            onChange={(e) => onUpdate({ targetFrame: e.target.value })}
            style={{ width: "200px", marginBottom: "0.5rem" }}
          />
          <div style={{ marginTop: "10px" }}>
            <button onClick={() => onAction && onAction("teleport")} style={{ padding: "5px 10px", cursor: "pointer", background: "#aaaaff", color: "white" }}>
              Teleport Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
