import { vi } from "vitest";

export const useCollaboration = vi.fn(() => ({
  isCollaborating: false,
  updateBoard: () => {},
}));
