import React from "react";

import { Excalidraw } from "../..";
import { render, waitFor, GlobalTestState } from "../../tests/test-utils";
import { TunnelsContext } from "../../context/tunnels";

export const assertSidebarDockButton = async <T extends boolean>(
  hasDockButton: T,
): Promise<
  T extends false
    ? { dockButton: null; sidebar: HTMLElement }
    : { dockButton: HTMLElement; sidebar: HTMLElement }
> => {
  const sidebar =
    GlobalTestState.renderResult.container.querySelector<HTMLElement>(
      ".sidebar",
    );
  expect(sidebar).not.toBe(null);
  const dockButton = queryByTestId(sidebar!, "sidebar-dock");
  if (hasDockButton) {
    expect(dockButton).not.toBe(null);
    return { dockButton: dockButton!, sidebar: sidebar! } as any;
  }
  expect(dockButton).toBe(null);
  return { dockButton: null, sidebar: sidebar! } as any;
};

export const assertExcalidrawWithSidebar = async (
  sidebar: React.ReactNode,
  name: string,
  test: () => Promise<void>,
) => {
  const tunnels = {};
  await render(
    <TunnelsContext.Provider value={tunnels as any}>
      <Excalidraw initialData={{ appState: { openSidebar: { name } } }}>
        {sidebar}
      </Excalidraw>
    </TunnelsContext.Provider>,
  );
  await waitFor(() => {
    const canvas = GlobalTestState.renderResult.container.querySelector("canvas");
    expect(canvas).not.toBeNull();
  });
  await withExcalidrawDimensions({ width: 1920, height: 1080 }, async () => {
    await test();
  });
};