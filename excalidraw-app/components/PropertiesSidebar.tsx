import React from "react";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

interface PropertiesSidebarProps {
  element: NonDeletedExcalidrawElement;
  onUpdate: (data: any) => void;
}

export const PropertiesSidebar: React.FC<PropertiesSidebarProps> = ({
  element,
  onUpdate,
}) => {
  const { customData = {} } = element;

  const handleIncrement = () => {
    onUpdate({ value: (customData.value || 0) + 1 });
  };

  const handleDecrement = () => {
    onUpdate({ value: (customData.value || 0) - 1 });
  };

  const handleElementTypeChange = (type: string) => {
    if (type === "counter") {
      onUpdate({ isCounter: true, isCard: false, isZone: false });
    } else if (type === "card") {
      onUpdate({ isCounter: false, isCard: true, isZone: false });
    } else if (type === "zone") {
      onUpdate({ isCounter: false, isCard: false, isZone: true });
    } else {
      onUpdate({ isCounter: false, isCard: false, isZone: false });
    }
  };

  const elementType = customData.isCounter
    ? "counter"
    : customData.isCard
    ? "card"
    : customData.isZone
    ? "zone"
    : "none";

  return (
    <div
      style={{
        background: "#fff",
        padding: "1rem",
        width: "250px",
        border: "1px solid #ccc",
        borderRadius: "8px",
      }}
    >
      <h4>Eigenschaften</h4>

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
            Standard
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
            Ist eine Karte
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
            Ist eine Zone
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
            Ist ein Zähler
          </label>
        </div>
      </div>

      {elementType === "counter" && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Zählt Karten-Typ (leer für manuellen Zähler)
          </label>
          <input
            type="text"
            placeholder="z.B. 'apfel' oder 'frage_1'"
            defaultValue={customData.countsType || ""}
            onChange={(e) => onUpdate({ countsType: e.target.value })}
            style={{ width: "200px", marginBottom: "0.5rem" }}
          />
          <p>Counter Value: {customData.value || 0}</p>
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
            Karten-Typ
          </label>
          <input
            type="text"
            placeholder="z.B. 'apfel' oder 'frage_1'"
            defaultValue={customData.cardType || ""}
            onChange={(e) => onUpdate({ cardType: e.target.value })}
            style={{ width: "200px" }}
          />
        </div>
      )}

      {elementType === "zone" && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Akzeptierte Karten-Typen (kommagetrennt)
          </label>
          <input
            type="text"
            placeholder="z.B. 'apfel,birne'"
            defaultValue={customData.acceptedCardTypes || ""}
            onChange={(e) => onUpdate({ acceptedCardTypes: e.target.value })}
            style={{ width: "200px" }}
          />
        </div>
      )}
    </div>
  );
};
