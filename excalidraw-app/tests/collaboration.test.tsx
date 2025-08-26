import { test, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCollaboration } from "../hooks/useCollaboration";
import { SocketIOProvider } from "y-socket.io";
import * as Y from "yjs";

vi.mock('y-socket.io', () => ({
  SocketIOProvider: vi.fn().mockImplementation((url, boardId, ydoc, { auth }) => ({
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
    doc: ydoc,
    awareness: {
      on: vi.fn(),
      off: vi.fn(),
      setLocalStateField: vi.fn(),
    },
    destroy: vi.fn(), // Mock the destroy method
  })),
}));

vi.mock('jotai', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    useAtomValue: vi.fn(() => ({
      accessToken: 'fake-token-for-test',
      user: { username: 'Test User' },
    })),
  };
});

test("useCollaboration sollte Provider und Binding-Klasse korrekt initialisieren", () => {
  const boardId = "test-board-id";
  const { result } = renderHook(() => useCollaboration(boardId));

  expect(SocketIOProvider).toHaveBeenCalled();
  expect(result.current).toBeInstanceOf(SocketIOProvider);
});
