import { fileURLToPath, URL } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // Bind to all interfaces so the sandbox live preview (https://{port}-{id}.e2b.app) works.
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    // Same-origin passthrough to the upstream iptv-org API. Keeps "sync latest catalog"
    // free of CORS surprises in dev and in `vite preview`.
    proxy: {
      "/iptv-api": {
        target: "https://iptv-org.github.io/api",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/iptv-api/, ""),
      },
      // Fallback used when the CDN is unreachable (e.g. a sandboxed network):
      // the GitHub API serves the very same generated files from `gh-pages`.
      "/github-api": {
        target: "https://api.github.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/github-api/, ""),
        headers: { "user-agent": "live-tv-hub" },
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: true,
    proxy: {
      "/iptv-api": {
        target: "https://iptv-org.github.io/api",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/iptv-api/, ""),
      },
      "/github-api": {
        target: "https://api.github.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/github-api/, ""),
        headers: { "user-agent": "live-tv-hub" },
      },
    },
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          hls: ["hls.js"],
          react: ["react", "react-dom", "react-router-dom"],
          radix: ["radix-ui", "cmdk"],
        },
      },
    },
  },
})
