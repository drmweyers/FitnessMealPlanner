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
      { find: "@", replacement: path.resolve(process.cwd(), "src") },
      { find: "@shared", replacement: path.resolve(process.cwd(), "../shared") },
      { find: "@assets", replacement: path.resolve(process.cwd(), "../attached_assets") },
    ],
  },
  root: "client",
  build: {
    outDir: "client/dist",
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: false,
      allow: [".."],
    },
    hmr: {
      port: 24678,
      host: "0.0.0.0",
      overlay: false,
    },
  },
});
