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
    if (type === "counter") {
      onUpdate({ isCounter: true, isCard: false, isZone: false, isTimer: false, isTeleporter: false });
    } else if (type === "card") {
      onUpdate({ isCounter: false, isCard: true, isZone: false, isTimer: false, isTeleporter: false });
    } else if (type === "zone") {
      onUpdate({ isCounter: false, isCard: false, isZone: true, isTimer: false, isTeleporter: false });
    } else if (type === "timer") {
      onUpdate({ isCounter: false, isCard: false, isZone: false, isTimer: true, isTeleporter: false });
    } else if (type === "teleporter") {
      onUpdate({ isCounter: false, isCard: false, isZone: false, isTimer: false, isTeleporter: true });
    } else {
      onUpdate({ isCounter: false, isCard: false, isZone: false, isTimer: false, isTeleporter: false });
    }
  };

  const elementType = customData.isCounter
    ? "counter"
    : customData.isCard
    ? "card"
    : customData.isZone
    ? "zone"
    : customData.isTimer
    ? "timer"
    : customData.isTeleporter
    ? "teleporter"
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
              value="timer"
              checked={elementType === "timer"}
              onChange={() => handleElementTypeChange("timer")}
            />
            Timer (Countdown)
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
            {t("propertiesSidebar.zone.acceptedCardTypes") || "Akzeptierte Karten:"}
          </label>
          <input
            type="text"
            placeholder={t("propertiesSidebar.zone.placeholder") || "Typ"}
            defaultValue={customData.acceptedCardTypes || ""}
            onChange={(e) => onUpdate({ acceptedCardTypes: e.target.value })}
            style={{ width: "200px" }}
          />
        </div>
      )}

      {elementType === "timer" && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Dauer (Sekunden):
          </label>
          <input
            type="number"
            placeholder="z.B. 300"
            defaultValue={customData.timerDuration || 300}
            onChange={(e) => onUpdate({ timerDuration: parseInt(e.target.value, 10) || 0 })}
            style={{ width: "200px", marginBottom: "0.5rem" }}
          />
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={() => onAction && onAction("startTimer")} style={{ padding: "5px 10px", cursor: "pointer", background: "#aaffaa" }}>
              Start Timer
            </button>
            <button onClick={() => onAction && onAction("resetTimer")} style={{ padding: "5px 10px", cursor: "pointer", background: "#ffaaaa" }}>
              Reset Freeze
            </button>
          </div>
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
