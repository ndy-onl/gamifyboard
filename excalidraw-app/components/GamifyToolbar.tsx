// Datei: /var/www/gamifyboard/excalidraw-app/components/GamifyToolbar.tsx

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import type React from "react";

interface GamifyToolbarProps {
  excalidrawAPI: ExcalidrawImperativeAPI;
}

export const GamifyToolbar: React.FC<GamifyToolbarProps> = ({
  excalidrawAPI,
}) => {
  // The toolbar is currently not needed as the functionality is handled
  // via the PropertiesSidebar. This component remains as a placeholder for
  // potential future toolbar items.
  return null;
};
