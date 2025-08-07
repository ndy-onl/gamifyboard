import { defaultLang } from "@excalidraw/excalidraw/i18n";
import { UI } from "@excalidraw/excalidraw/tests/helpers/ui";
import {
  screen,
  fireEvent,
  waitFor,
  render,
} from "@excalidraw/excalidraw/tests/test-utils";

import ExcalidrawApp from "../App";

describe("Test LanguageList", () => {
  it("rerenders UI on language change", async () => {
    await render(<ExcalidrawApp />);

    // select rectangle tool to show properties menu
    UI.clickTool("rectangle");
    UI.createElement("rectangle");
    const propertiesSidebar = document.querySelector(".properties-sidebar");
    expect(propertiesSidebar).not.toBeNull();
    // initial language should display `Eigenschaften` label
    expect(screen.queryByText(/Eigenschaften/i)).not.toBeNull();
    fireEvent.click(document.querySelector(".dropdown-menu-button")!);

    // Wait for dropdown menu to be fully rendered and debug what's there
    await waitFor(() => {
      const dropdownMenu = document.querySelector(".dropdown-menu");
      expect(dropdownMenu).not.toBeNull();
    });

    // Add some debugging to see what's in the dropdown
    const dropdownContent = document.querySelector(".dropdown-menu")?.innerHTML;
    console.log("Dropdown content:", dropdownContent?.substring(0, 500));

    // Wait for language selector
    await waitFor(() => {
      const languageSelect = document.querySelector(
        ".dropdown-select__language",
      );
      expect(languageSelect).not.toBeNull();
    });

    fireEvent.change(document.querySelector(".dropdown-select__language")!, {
      target: { value: defaultLang.code },
    });
    // switching to English, `Properties` label should be present
    await waitFor(() =>
      expect(screen.queryByText(/Properties/i)).not.toBeNull(),
    );
    // reset language
    await waitFor(() => {
      const languageSelect = document.querySelector(
        ".dropdown-select__language",
      );
      expect(languageSelect).not.toBeNull();
    });

    fireEvent.change(document.querySelector(".dropdown-select__language")!, {
      target: { value: "de-DE" },
    });
    // switching back to German
    await waitFor(() =>
      expect(screen.queryByText(/Eigenschaften/i)).not.toBeNull(),
    );
  });
});
