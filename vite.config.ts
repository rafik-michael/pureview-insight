import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Plain React + Vite SPA — no SSR, no TanStack Start.
// `base: "./"` makes the built site work when hosted on a subpath
// (GitHub Pages project sites) as well as root-level (Vercel / Netlify).
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    host: "::",
    port: 8080,
  },
});
