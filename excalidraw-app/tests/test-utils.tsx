import React from "react";

import { render as originalRender } from "@excalidraw/excalidraw/tests/test-utils";

import { EditorJotaiProvider } from "@excalidraw/excalidraw/editor-jotai";

import { editorJotaiStore } from "@excalidraw/excalidraw/editor-jotai";

import type { RenderOptions } from "@excalidraw/excalidraw/tests/test-utils";

import { Provider as AppJotaiProvider } from "../app-jotai";
import { appJotaiStore } from "../app-jotai";

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <AppJotaiProvider store={appJotaiStore}>
      <EditorJotaiProvider store={editorJotaiStore}>
        {children}
      </EditorJotaiProvider>
    </AppJotaiProvider>
  );
};

const render = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => originalRender(ui, { wrapper: AllTheProviders, ...options });

export * from "@excalidraw/excalidraw/tests/test-utils";
export { render };
