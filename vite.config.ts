import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// Build identity (hash + timestamp) injected into the client bundle so the
// BuildStatus panel and E2E suite can verify which build is actually running.
const BUILD_TIMESTAMP = new Date().toISOString();
const BUILD_HASH =
  process.env.LOVABLE_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  // Fallback: timestamp-derived short hash, unique per build.
  Math.random().toString(36).slice(2, 10);

const BUILD_VERSION = `${BUILD_HASH}-${Date.parse(BUILD_TIMESTAMP)}`;

/**
 * Emits a `/version.json` at build time AND serves it in dev.
 * The frontend polls this endpoint to detect new deploys and auto-reload.
 */
function versionJsonPlugin(): Plugin {
  const payload = () =>
    JSON.stringify({
      version: BUILD_VERSION,
      hash: BUILD_HASH,
      timestamp: BUILD_TIMESTAMP,
    });

  return {
    name: "fj-version-json",
    apply: () => true,
    configureServer(server) {
      server.middlewares.use("/version.json", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        res.end(payload());
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: payload(),
      });
    },
    closeBundle() {
      // Also write to public for static hosting fallback
      try {
        const out = path.resolve(__dirname, "public", "version.json");
        fs.writeFileSync(out, payload(), "utf8");
      } catch {}
    },
    transformIndexHtml(html) {
      return html
        .replace(/%BUILD_VERSION%/g, BUILD_VERSION)
        .replace(/%BUILD_TIMESTAMP%/g, BUILD_TIMESTAMP);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  define: {
    __BUILD_HASH__: JSON.stringify(BUILD_HASH),
    __BUILD_TIMESTAMP__: JSON.stringify(BUILD_TIMESTAMP),
    __BUILD_MODE__: JSON.stringify(mode),
    __BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    versionJsonPlugin(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.png", "pwa-192x192.png", "pwa-512x512.png"],
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/convite/, /^\/cadastro/, /^\/auth\/confirm/, /^\/intake/, /^\/api/, /^\/version\.json/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        importScripts: ["/sw-push.js"],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // / and /index.html — NetworkFirst to ensure we get the latest bundle hashes
            urlPattern: ({ url }) => url.pathname === "/" || url.pathname === "/index.html",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache",
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 },
            },
          },
          {
            // /version.json — must ALWAYS be fresh for the version-sync poller
            urlPattern: ({ url }) => url.pathname === "/version.json",
            handler: "NetworkOnly",
          },
          {
            // Supabase REST API — NetworkOnly for critical clinical data
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: "NetworkOnly",
          },
          {
            // Supabase Edge Functions — NEVER cache
            urlPattern: /^https:\/\/.*\.supabase\.co\/functions\/.*/i,
            handler: "NetworkOnly",
          },
          {
            // Supabase Auth — NEVER cache
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: "NetworkOnly",
          },
          {
            // Supabase Storage (images, files) — cache-first is safe
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-storage-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Fonts — long-lived cache
            urlPattern: /\.(woff2?|ttf|otf|eot)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "font-cache",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: "FitJourney — Nutrição Inteligente",
        short_name: "FitJourney",
        description: "Plataforma de nutrição com gamificação, IA clínica e acompanhamento personalizado. Acompanhe seu progresso metabólico, planos alimentares e evolução corporal.",
        theme_color: "#10b981",
        background_color: "#0d0d1a",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        categories: ["health", "fitness", "medical"],
        lang: "pt-BR",
        dir: "ltr",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        screenshots: [
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            form_factor: "narrow",
            label: "FitJourney - Home do Paciente"
          }
        ] as any,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  // Versionamento de assets via content hash — garante que o navegador NUNCA
  // sirva chunk antigo após publicar (cache busting determinístico).
  build: {
    sourcemap: mode !== "production",
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
      },
    },
  },
}));
