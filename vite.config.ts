import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * D-0001: basic Vite+React scaffold.
 * Note: build output to /docs will be configured later (D-0010).
 */
export default defineConfig({
  plugins: [react()],
});
