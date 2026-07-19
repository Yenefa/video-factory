import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri dev host is set when running on mobile / remote dev targets.
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  envPrefix: ["VITE", "TAURI_"],
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    watch: {
      // Don't trigger HMR on Rust-side changes.
      ignored: ["**/src-tauri/**"],
    },
  },
});
