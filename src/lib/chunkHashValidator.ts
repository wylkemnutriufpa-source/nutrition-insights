/**
 * FitJourney — Chunk Hash Validator
 *
 * Detecta se o navegador está executando assets de um build ANTERIOR ao
 * declarado em __BUILD_INFO__. Cenários típicos:
 *
 *  - CDN serviu /index.html novo, mas chunks antigos ainda em cache
 *  - Service Worker servindo bundle pré-deploy
 *  - Aba ficou aberta entre dois deploys
 *
 * Estratégia (sem rede extra):
 *  1. Lê todos os <script src=".../assets/*-[hash].js"> e <link href=...>
 *     já presentes no documento.
 *  2. Extrai os hashes (8+ chars hex/base36 entre o último "-" e a extensão).
 *  3. Compara com BUILD_INFO.shortHash. Se NENHUM chunk contiver o hash atual,
 *     há forte indício de cache antigo (mismatch).
 *
 * Notas:
 *  - Em DEV (vite serve), os assets não têm hash → retorna `ok` e marca dev.
 *  - Não dispara reload automático: apenas relata. UI decide o que fazer.
 */
import { BUILD_INFO } from "@/lib/buildInfo";

export type ChunkValidationStatus = "ok" | "mismatch" | "dev" | "unknown";

export interface ChunkValidationResult {
  status: ChunkValidationStatus;
  expectedHash: string;
  loadedHashes: string[];
  hashedAssetCount: number;
  message: string;
}

const HASHED_RE = /\/assets\/[^/?#]+-([a-z0-9]{6,})\.(?:js|css|mjs)/i;

function collectAssetUrls(): string[] {
  const urls: string[] = [];
  document.querySelectorAll<HTMLScriptElement>("script[src]").forEach((s) => {
    if (s.src) urls.push(s.src);
  });
  document.querySelectorAll<HTMLLinkElement>("link[href]").forEach((l) => {
    if (l.href && (l.rel === "stylesheet" || l.rel === "modulepreload")) {
      urls.push(l.href);
    }
  });
  return urls;
}

export function validateChunkHashes(): ChunkValidationResult {
  if (typeof document === "undefined") {
    return {
      status: "unknown",
      expectedHash: BUILD_INFO.shortHash,
      loadedHashes: [],
      hashedAssetCount: 0,
      message: "DOM indisponível",
    };
  }

  if (BUILD_INFO.mode !== "production") {
    return {
      status: "dev",
      expectedHash: BUILD_INFO.shortHash,
      loadedHashes: [],
      hashedAssetCount: 0,
      message: "Modo dev (assets sem hash)",
    };
  }

  const urls = collectAssetUrls();
  const loadedHashes: string[] = [];
  for (const url of urls) {
    const m = HASHED_RE.exec(url);
    if (m && m[1]) loadedHashes.push(m[1]);
  }

  if (loadedHashes.length === 0) {
    return {
      status: "unknown",
      expectedHash: BUILD_INFO.shortHash,
      loadedHashes: [],
      hashedAssetCount: 0,
      message: "Nenhum asset hash detectado",
    };
  }

  const expected = BUILD_INFO.shortHash.toLowerCase();
  const matchesExpected = loadedHashes.some((h) =>
    h.toLowerCase().includes(expected),
  );

  if (matchesExpected) {
    return {
      status: "ok",
      expectedHash: BUILD_INFO.shortHash,
      loadedHashes,
      hashedAssetCount: loadedHashes.length,
      message: `OK (${loadedHashes.length} assets)`,
    };
  }

  // Heurística secundária: se /index.html declara __BUILD_HASH__ mas
  // nenhum chunk carregado contém esse fragmento, é mismatch real
  // (CDN ou SW servindo assets de build anterior).
  return {
    status: "mismatch",
    expectedHash: BUILD_INFO.shortHash,
    loadedHashes,
    hashedAssetCount: loadedHashes.length,
    message: `Hash do build (${BUILD_INFO.shortHash}) não encontrado em nenhum chunk carregado`,
  };
}
