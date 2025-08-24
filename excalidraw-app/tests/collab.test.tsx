import { render, screen, waitFor, act } from "./test-utils";
import ExcalidrawApp from "../App";
import { vi } from "vitest";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { newElementWith } from "@excalidraw/excalidraw";

// Mock the whole y-websocket module
vi.mock("y-websocket", () => ({
  WebsocketProvider: vi.fn().mockImplementation((serverUrl, room, ydoc) => {
    // Make the ydoc accessible to the test
    (window as any).mostRecentYDoc = ydoc;
    return {
      awareness: new Awareness(ydoc),
      destroy: vi.fn(),
    };
  }),
}));

describe("Collaboration via y-websocket", () => {
  it("should update the canvas when a remote change is made to the Y.Doc", async () => {
    // 1. Set up the URL to simulate joining a collaboration room
    window.history.pushState({}, "", "?id=my-test-room");

    // 2. Render the application
    await render(<ExcalidrawApp />);

    // 3. Wait for the Excalidraw component to be ready and get the Y.Doc
    let ydoc: Y.Doc | undefined;
    await waitFor(() => {
      ydoc = (window as any).mostRecentYDoc;
      expect(ydoc).toBeInstanceOf(Y.Doc);
    });

    // Ensure ydoc is defined before proceeding
    if (!ydoc) {
      throw new Error("Y.Doc was not initialized by the mock provider");
    }

    // 4. Simulate a remote change by directly manipulating the Y.Doc
    const yElements = ydoc.getArray<Y.Map<any>>("elements");
    const textElement = newElementWith({
      type: "text",
      x: 100,
      y: 100,
      text: "Remote Text",
    });

    const yText = new Y.Map();
    yText.set("el", textElement);
    yText.set("pos", "a1"); // Fractional index for sorting

    act(() => {
      Y.transact(ydoc!, () => {
        yElements.insert(0, [yText]);
      });
    });

    await waitFor(() => {
      screen.debug();
      const remoteElement = screen.getByText("Remote Text");
      expect(remoteElement).toBeInTheDocument();
    });
  });
});