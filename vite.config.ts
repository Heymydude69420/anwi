import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The GitHub Pages site is served from the /anwi/ subpath, not the domain
// root, so every asset URL has to be prefixed or the built page 404s.
export default defineConfig({
  base: "/anwi/",
  plugins: [react()],

  resolve: {
    // Without this, a dependency that resolves React through its own path can
    // end up as a second copy in the module graph — which surfaces as
    // "Invalid hook call", because hooks from one React instance run against
    // the other's dispatcher.
    dedupe: ["react", "react-dom"],
  },

  optimizeDeps: {
    // Pre-bundle everything up front. Discovering a new dependency mid-session
    // makes Vite re-optimise and reload, and for a moment the page holds
    // modules from both the old and new optimisation passes.
    include: ["react", "react-dom", "react-dom/client", "react-router-dom", "framer-motion"],
  },

  build: { outDir: "dist", assetsDir: "assets" },
});
