import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
// Importieren Sie den soeben erstellten Provider

const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
