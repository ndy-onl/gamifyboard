/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  define: {
    'import.meta.env.MODE': JSON.stringify('test'),
    'import.meta.env.DEV': JSON.stringify(true),
    'import.meta.env.PROD': JSON.stringify(false),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    projects: ['packages/*'],
    isolate: true,
    setupFiles: './setupTests.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
    },
    deps: {
      inline: [/ @excalidraw\//],
    },
  },
  resolve: {
    mainFields: ['module', 'main'],
    alias: {
    },
  },
});
