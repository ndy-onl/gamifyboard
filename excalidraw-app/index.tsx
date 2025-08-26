import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// Importieren Sie den soeben erstellten Provider
import { CollaborationProvider } from "./context/CollaborationContext";

const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <CollaborationProvider> {/* Umschließen Sie die App-Komponente */}
      <App />
    </CollaborationProvider>
  </StrictMode>,
);
