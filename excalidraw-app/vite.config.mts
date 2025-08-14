import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths({
      projects: [path.resolve(__dirname, '../tsconfig.json')],
    }),
  ],
  server: {
    fs: {
      // Erlaubt dem Vite-Server, Dateien aus dem gesamten Monorepo-Stammverzeichnis bereitzustellen.
      // Dies ist entscheidend für den Zugriff auf hochgezogene node_modules und andere Workspace-Pakete.
      allow: [searchForWorkspaceRoot(process.cwd())],
    },
  },
  resolve: {
    // Verhindert das "Dual Package"-Problem, bei dem mehrere Instanzen von React/React-DOM
    // geladen werden könnten, was zu Fehlern bei Hooks und Context führt.
    dedupe: ['react', 'react-dom'],
  },
});