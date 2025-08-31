import { renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { useAtomValue } from "jotai";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useCollaboration } from "../hooks/useCollaboration";
import { GamifyCollaboration } from "../collaboration/GamifyCollaboration";

// Mock the entire module containing the class
vi.mock("../collaboration/GamifyCollaboration");

// Mock jotai's useAtomValue
vi.mock("jotai", async () => {
  const original = await vi.importActual("jotai");
  return {
    ...original,
    useAtomValue: vi.fn(),
  };
});

const mockExcalidrawAPI = {} as unknown as ExcalidrawImperativeAPI;

describe("useCollaboration Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should not connect if user is not logged in", () => {
    // Arrange: Simulate a logged-out user
    vi.mocked(useAtomValue).mockReturnValue({
      isLoggedIn: false,
      accessToken: null,
    });

    // Act
    renderHook(() => useCollaboration(mockExcalidrawAPI, "board-123"));

    // Assert
    expect(GamifyCollaboration).not.toHaveBeenCalled();
  });

  test("should connect and update status if user is logged in", async () => {
    // Arrange: Simulate a logged-in user
    vi.mocked(useAtomValue).mockReturnValue({
      isLoggedIn: true,
      accessToken: "mock-access-token",
    });

    // Arrange: Mock the class implementation to simulate the hook's behavior
    const mockStart = vi.fn();
    const mockInstance = {
      start: mockStart,
      close: vi.fn(),
      onStatusChange: () => {},
    };
    vi.mocked(GamifyCollaboration).mockImplementation(() => mockInstance as any);

    // Make the mock `start` function trigger the `onStatusChange` that the hook will set.
    mockStart.mockImplementation(() => {
      mockInstance.onStatusChange("connected");
    });

    // Act
    const { result } = renderHook(() =>
      useCollaboration(mockExcalidrawAPI, "board-123"),
    );

    // Assert
    await waitFor(() => {
      expect(result.current.collaborationStatus).toBe("connected");
    });
    expect(GamifyCollaboration).toHaveBeenCalledTimes(1);
    expect(mockStart).toHaveBeenCalledWith("board-123");
  });
});