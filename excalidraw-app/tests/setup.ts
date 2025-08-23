import { vi } from "vitest";

// Global mocks for excalidraw-app tests
vi.mock("src/api", () => ({
  getBoard: vi.fn().mockResolvedValue({ data: null }),
  createBoard: vi.fn().mockResolvedValue({ data: { id: "test-board" } }),
  updateBoard: vi.fn().mockResolvedValue({ data: { id: "test-board" } }),
  loginUser: vi.fn().mockResolvedValue({ data: { token: "test-token" } }),
  registerUser: vi.fn().mockResolvedValue({ data: { token: "test-token" } }),
  getBoards: vi.fn().mockResolvedValue({ data: [] }),
  deleteBoard: vi.fn().mockResolvedValue({ data: { success: true } }),
  getProfile: vi
    .fn()
    .mockResolvedValue({ data: { email: "test@example.com" } }),
  refreshToken: vi
    .fn()
    .mockResolvedValue({ data: { token: "refreshed-token" } }),
}));

// Mock axios as well for safety
vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({ data: {} }),
      post: vi.fn().mockResolvedValue({ data: {} }),
      put: vi.fn().mockResolvedValue({ data: {} }),
      patch: vi.fn().mockResolvedValue({ data: {} }),
      delete: vi.fn().mockResolvedValue({ data: {} }),
    })),
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

// Suppress console warnings for cleaner test output
const originalConsole = console;
beforeEach(() => {
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterEach(() => {
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});
