import React from "react";
import { useI18n } from "@excalidraw/excalidraw/i18n";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

interface PropertiesSidebarProps {
  element: NonDeletedExcalidrawElement;
  onUpdate: (data: any) => void;
}

export const PropertiesSidebar: React.FC<PropertiesSidebarProps> = ({
  element,
  onUpdate,
}) => {
  const { t } = useI18n();
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
    <div className="properties-sidebar">
      <h4>{t("propertiesSidebar.title")}</h4>

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
            {t("propertiesSidebar.elementType.standard")}
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
            {t("propertiesSidebar.elementType.isCard")}
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
            {t("propertiesSidebar.elementType.isZone")}
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
            {t("propertiesSidebar.elementType.isCounter")}
          </label>
        </div>
      </div>

      {elementType === "counter" && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            {t("propertiesSidebar.counter.countsCardType")}
          </label>
          <input
            type="text"
            placeholder={t("propertiesSidebar.counter.placeholder")}
            defaultValue={customData.countsType || ""}
            onChange={(e) => onUpdate({ countsType: e.target.value })}
            style={{ width: "200px", marginBottom: "0.5rem" }}
          />
          <p>
            {t("propertiesSidebar.counter.value")}: {customData.value || 0}
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
            {t("propertiesSidebar.card.cardType")}
          </label>
          <input
            type="text"
            placeholder={t("propertiesSidebar.card.placeholder")}
            defaultValue={customData.cardType || ""}
            onChange={(e) => onUpdate({ cardType: e.target.value })}
            style={{ width: "200px" }}
          />
        </div>
      )}

      {elementType === "zone" && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            {t("propertiesSidebar.zone.acceptedCardTypes")}
          </label>
          <input
            type="text"
            placeholder={t("propertiesSidebar.zone.placeholder")}
            defaultValue={customData.acceptedCardTypes || ""}
            onChange={(e) => onUpdate({ acceptedCardTypes: e.target.value })}
            style={{ width: "200px" }}
          />
        </div>
      )}
    </div>
  );
};
