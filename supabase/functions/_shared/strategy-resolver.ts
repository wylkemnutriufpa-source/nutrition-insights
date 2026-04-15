/**
 * Strategy Resolver — Detects which nutrition strategy to use
 * based on patient protocols, clinical flags, and request parameters.
 */

import type { StrategyId } from "./strategies.ts";

interface ResolverInput {
  /** Explicit strategy from request body (highest priority) */
  requestedStrategy?: string;
  /** Generation mode from request */
  generationMode?: string;
  /** BB phase from request (signals bikini protocol) */
  bbPhase?: number;
  /** Active protocol names for the patient */
  activeProtocolNames?: string[];
  /** Active clinical flags */
  clinicalFlags?: string[];
  /** Active program enrollments */
  programSlugs?: string[];
}

export interface ResolvedStrategy {
  strategyId: StrategyId;
  reason: string;
}

const BB_KEYWORDS = ["biquini", "bikini", "bb", "biquíni", "transformacao_corporal"];

export function detectStrategy(input: ResolverInput): ResolvedStrategy {
  // 1. Explicit request (highest priority)
  if (input.requestedStrategy) {
    const normalized = input.requestedStrategy.toLowerCase().trim();
    if (normalized === "bikini_protocol" || normalized === "biquini_branco") {
      return { strategyId: "bikini_protocol", reason: "Explicit request: bikini_protocol" };
    }
    if (normalized === "clinical_standard" || normalized === "clinical") {
      return { strategyId: "clinical_standard", reason: "Explicit request: clinical_standard" };
    }
    if (normalized === "ifj_standard" || normalized === "ifj") {
      return { strategyId: "ifj_standard", reason: "Explicit request: ifj_standard" };
    }
  }

  // 2. BB phase signal
  if (input.bbPhase && input.bbPhase >= 1 && input.bbPhase <= 4) {
    return { strategyId: "bikini_protocol", reason: `BB phase ${input.bbPhase} detected` };
  }

  // 3. Active protocol names
  if (input.activeProtocolNames?.length) {
    for (const name of input.activeProtocolNames) {
      const norm = name.toLowerCase();
      if (BB_KEYWORDS.some(kw => norm.includes(kw))) {
        return { strategyId: "bikini_protocol", reason: `Protocol "${name}" matches BB` };
      }
    }
  }

  // 4. Program enrollments
  if (input.programSlugs?.length) {
    for (const slug of input.programSlugs) {
      const norm = slug.toLowerCase();
      if (BB_KEYWORDS.some(kw => norm.includes(kw))) {
        return { strategyId: "bikini_protocol", reason: `Program "${slug}" matches BB` };
      }
    }
  }

  // 5. Clinical mode
  if (input.generationMode === "clinical") {
    return { strategyId: "clinical_standard", reason: "Generation mode is clinical" };
  }

  // 6. High-severity clinical flags → clinical strategy
  const highSeverityFlags = ["renal_risk", "diabetes_risk", "insulin_resistance", "cardiovascular_risk"];
  if (input.clinicalFlags?.some(f => highSeverityFlags.includes(f))) {
    return { strategyId: "clinical_standard", reason: "High-severity clinical flags present" };
  }

  // 7. Default
  return { strategyId: "ifj_standard", reason: "Default strategy" };
}
