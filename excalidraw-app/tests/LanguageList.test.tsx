import { defaultLang } from "@excalidraw/excalidraw/i18n";
import { UI } from "@excalidraw/excalidraw/tests/helpers/ui";

import {
  waitFor,
  render,
  within,
  act,
} from "@excalidraw/excalidraw/tests/test-utils";
import { appJotaiStore } from "../app-jotai";
import { appLangCodeAtom } from "../app-language/language-state";

import ExcalidrawApp from "../App";

describe("Test LanguageList", () => {
  it("rerenders UI on language change", async () => {
    await render(<ExcalidrawApp />);

    // First set language to German to establish baseline
    act(() => {
      appJotaiStore.set(appLangCodeAtom, "de-DE");
    });

    // Wait a moment for language to be applied
    await new Promise(resolve => setTimeout(resolve, 100));

    // select rectangle tool to show properties menu
    UI.clickTool("rectangle");
    UI.createElement("rectangle");

    await waitFor(() => {
      const propertiesSidebar = document.querySelector(
        ".properties-sidebar-container",
      );
      expect(propertiesSidebar).not.toBeNull();
    });

    // Check German text is present
    await waitFor(() => {
      const propertiesSidebar = document.querySelector(
        ".properties-sidebar-container",
      );
      expect(propertiesSidebar).not.toBeNull();
      expect(
        within(propertiesSidebar as HTMLElement).queryByText(/Eigenschaften/i),
      ).not.toBeNull();
    });

    // Switch to English
    act(() => {
      appJotaiStore.set(appLangCodeAtom, defaultLang.code);
    });

    // Wait for language to propagate
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create a new element to ensure sidebar refreshes
    UI.clickTool("selection");
    UI.clickTool("rectangle");
    UI.createElement("rectangle", { x: 50, y: 50 });

    // Check English text is present
    await waitFor(
      () => {
        const propertiesSidebar = document.querySelector(
          ".properties-sidebar-container",
        );
        expect(propertiesSidebar).not.toBeNull();
        expect(
          within(propertiesSidebar as HTMLElement).queryByText(/Properties/i),
        ).not.toBeNull();
      },
      { timeout: 10000 }
    );
  });
});
