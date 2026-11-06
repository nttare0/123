import { fileURLToPath, URL } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: "search-console-verification",
    transformIndexHtml: {
      handler: (_html, context) => {
        const mode = context.server?.config.mode ?? "production"
        const token = loadEnv(mode, process.cwd(), "VITE_GOOGLE_SITE_VERIFICATION").VITE_GOOGLE_SITE_VERIFICATION
        return token ? [{ tag: "meta", attrs: { name: "google-site-verification", content: token }, injectTo: "head" as const }] : []
      },
    },
  }],
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
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: true,
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
