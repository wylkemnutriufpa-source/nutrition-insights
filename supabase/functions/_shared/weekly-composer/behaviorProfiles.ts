/**
 * Behavior Profiles — frozen catalogue.
 * Profiles are RECEIVED by the composer, never decided by it (Contract §3).
 */

import type { BehaviorProfile, BehaviorProfileName } from "./types.ts";

export const BEHAVIOR_PROFILES: Record<BehaviorProfileName, BehaviorProfile> = {
  standard: {
    name: "standard",
    minDistinctPerWeek: 3,
    maxRepeatConsecutive: 3,
    rotationStrength: 0.6,
  },
  strict_variation: {
    name: "strict_variation",
    minDistinctPerWeek: 5,
    maxRepeatConsecutive: 1,
    rotationStrength: 1.0,
  },
  high_adherence: {
    name: "high_adherence",
    minDistinctPerWeek: 2,
    maxRepeatConsecutive: 5,
    rotationStrength: 0.3,
  },
  low_complexity: {
    name: "low_complexity",
    minDistinctPerWeek: 1,
    maxRepeatConsecutive: 7,
    rotationStrength: 0.0,
  },
  clinical_restriction: {
    name: "clinical_restriction",
    minDistinctPerWeek: 2,
    maxRepeatConsecutive: 4,
    rotationStrength: 0.4,
  },
};

export function getBehaviorProfile(
  name: BehaviorProfileName,
): BehaviorProfile {
  return BEHAVIOR_PROFILES[name];
}

export function isValidBehaviorProfile(
  p: BehaviorProfile | undefined | null,
): p is BehaviorProfile {
  if (!p) return false;
  if (!(p.name in BEHAVIOR_PROFILES)) return false;
  if (typeof p.minDistinctPerWeek !== "number" || p.minDistinctPerWeek < 1) {
    return false;
  }
  if (
    typeof p.maxRepeatConsecutive !== "number" ||
    p.maxRepeatConsecutive < 1
  ) {
    return false;
  }
  if (
    typeof p.rotationStrength !== "number" ||
    p.rotationStrength < 0 ||
    p.rotationStrength > 1
  ) return false;
  return true;
}
