/// <reference types="vite/client" />

// Build identity injected at build time via vite.config.ts `define`.
declare const __BUILD_HASH__: string;
declare const __BUILD_TIMESTAMP__: string;
declare const __BUILD_MODE__: string;
declare const __BUILD_VERSION__: string;
