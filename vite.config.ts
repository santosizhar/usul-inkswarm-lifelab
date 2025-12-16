import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * D-0010: GitHub Pages build-to-/docs on main.
 *
 * - `base` is relative so the build works under `/<repo>/` (GitHub Pages) without extra config.
 * - Build output goes to `/docs` (instead of `/dist`) so Pages can serve from main/docs.
 */
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "docs",
    emptyOutDir: true,
    assetsDir: "assets",
  },
});
