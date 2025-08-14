import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths({ projects: ['../tsconfig.json'] })],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    exclude: ["./tests/e2e/**"],
    testTimeout: 30000,
    hookTimeout: 30000,
    deps: {
      optimizer: {
        web: {
          include: ['axios'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['axios'],
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
});