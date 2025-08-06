// Datei: /var/www/gamifyboard/excalidraw-app/components/GamifyToolbar.tsx

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { newCounterElement } from "../../packages/element/src/newElement";
import type React from "react";

interface GamifyToolbarProps {
  excalidrawAPI: ExcalidrawImperativeAPI;
}

export const GamifyToolbar: React.FC<GamifyToolbarProps> = ({
  excalidrawAPI,
}) => {
  const createCounter = () => {
    const counterElement = newCounterElement({
      type: "counter",
      x: 100,
      y: 100,
      width: 100,
      height: 50,
    });
    excalidrawAPI.updateScene({
      elements: [...excalidrawAPI.getSceneElements(), counterElement],
    });
  };

  return (
    <div style={{ position: "absolute", top: "50%", left: "10px", transform: "translateY(-50%)", zIndex: 10 }}>
      <button onClick={createCounter}>Create Counter</button>
    </div>
  );
};