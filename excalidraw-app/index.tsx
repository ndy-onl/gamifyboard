import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../excalidraw-app/sentry";

import ExcalidrawApp from "./App";
import { Provider } from "./app-jotai";

window.__EXCALIDRAW_SHA__ = import.meta.env.VITE_APP_GIT_SHA;
const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

// PWA Service Worker registration temporarily disabled during development
// TODO: Install and configure vite-plugin-pwa for production builds
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  // Register service worker only in production
  console.log("Service Worker registration would happen here in production");
}
root.render(
  <StrictMode>
    <Provider>
      <ExcalidrawApp />
    </Provider>
  </StrictMode>,
);
