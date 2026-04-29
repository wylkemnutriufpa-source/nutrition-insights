/**
 * FitJourney — Build Identity
 *
 * Single source of truth for the build hash, timestamp and mode.
 * Used by:
 *  - <BuildStatusPanel /> (visible debug overlay in dev)
 *  - PWA cache busting (UpdateBanner registers SW with a ?v=hash query)
 *  - E2E tests (window.__BUILD_INFO__ assertion)
 *  - data-build-hash on <html> for visual confirmation in DOM
 */

export interface BuildInfo {
  hash: string;
  timestamp: string;
  mode: string;
  shortHash: string;
  version: string;
}

const safeHash =
  typeof __BUILD_HASH__ !== "undefined" ? __BUILD_HASH__ : "dev-local";
const safeTimestamp =
  typeof __BUILD_TIMESTAMP__ !== "undefined"
    ? __BUILD_TIMESTAMP__
    : new Date().toISOString();
const safeMode =
  typeof __BUILD_MODE__ !== "undefined" ? __BUILD_MODE__ : "development";

export const BUILD_INFO: BuildInfo = {
  hash: safeHash,
  timestamp: safeTimestamp,
  mode: safeMode,
  shortHash: String(safeHash).slice(0, 8),
  version: "2.4.0-hotfix-deploy-check"
};

/**
 * Stamp the build identity on:
 *  - <html data-build-hash=... data-build-time=...>
 *  - window.__BUILD_INFO__ (for E2E + console)
 *  - console.info (single line, easy to grep)
 */
export function stampBuildIdentity(): void {
  try {
    document.documentElement.setAttribute("data-build-hash", BUILD_INFO.shortHash);
    document.documentElement.setAttribute("data-build-time", BUILD_INFO.timestamp);
    document.documentElement.setAttribute("data-build-mode", BUILD_INFO.mode);
  } catch {}

  try {
    (window as any).__BUILD_INFO__ = BUILD_INFO;
  } catch {}

  // eslint-disable-next-line no-console
  console.info(
    `[FJ] build=${BUILD_INFO.shortHash} mode=${BUILD_INFO.mode} ts=${BUILD_INFO.timestamp}`,
  );
}
