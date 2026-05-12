/**
 * Engine Version Governance
 * 
 * Tracks and flags meal plans generated with outdated engine versions.
 * Plans below the minimum supported version should be flagged for regeneration.
 */

export const CURRENT_ENGINE_VERSION = "4.0.0";
export const MINIMUM_SUPPORTED_VERSION = "3.0.0";

/**
 * Parses a semver string into comparable numbers.
 */
function parseVersion(v: string): number[] {
  return (v || "0.0.0").split(".").map(Number);
}

/**
 * Returns true if version a < version b (semver comparison).
 */
function isOlderThan(a: string, b: string): boolean {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if ((va[i] || 0) < (vb[i] || 0)) return true;
    if ((va[i] || 0) > (vb[i] || 0)) return false;
  }
  return false;
}

export type EngineStatus = "current" | "outdated" | "unsupported";

export interface EngineVersionCheck {
  status: EngineStatus;
  planVersion: string;
  currentVersion: string;
  message?: string;
}

/**
 * Checks if a plan's engine version is current, outdated, or unsupported.
 */
export function checkEngineVersion(planEngineVersion: string | null | undefined): EngineVersionCheck {
  const v = planEngineVersion || "1.0.0";

  if (!isOlderThan(v, CURRENT_ENGINE_VERSION)) {
    return {
      status: "current",
      planVersion: v,
      currentVersion: CURRENT_ENGINE_VERSION,
    };
  }

  if (isOlderThan(v, MINIMUM_SUPPORTED_VERSION)) {
    return {
      status: "unsupported",
      planVersion: v,
      currentVersion: CURRENT_ENGINE_VERSION,
      message: `Este plano foi gerado com o motor v${v} (mínimo suportado: v${MINIMUM_SUPPORTED_VERSION}). Recomendamos regenerar para garantir consistência clínica.`,
    };
  }

  return {
    status: "outdated",
    planVersion: v,
    currentVersion: CURRENT_ENGINE_VERSION,
    message: `Este plano usa o motor v${v}. A versão atual é v${CURRENT_ENGINE_VERSION}. Considere regenerar para aplicar as melhorias mais recentes.`,
  };
}
