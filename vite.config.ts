import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath, URL } from 'node:url';
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "client/src") },
      { find: "@shared", replacement: path.resolve(__dirname, "shared") },
      { find: "@assets", replacement: path.resolve(__dirname, "attached_assets") },
    ],
  },
  root: "client",
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for large external dependencies
          vendor: ['react', 'react-dom'],
          // UI components chunk
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-toast'],
          // Chart and visualization chunk
          charts: ['recharts'],
          // PDF export chunk (includes html2canvas)
          pdf: ['jspdf', 'html2canvas'],
          // Form handling chunk
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Query and state management
          query: ['@tanstack/react-query'],
          // Icons and animations
          icons: ['lucide-react', 'framer-motion']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: true
  },
  server: {
    fs: {
      strict: false,
      allow: [".."],
    },
    hmr: {
      overlay: false,
    },
  },
});
