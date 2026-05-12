import { describe, it, expect } from "vitest";
import {
  composeSlotSequence,
  getBehaviorProfile,
  BEHAVIOR_PROFILES,
} from "../../../supabase/functions/_shared/weekly-composer/index.ts";
import type { PoolItem } from "../../../supabase/functions/_shared/weekly-composer/types.ts";

const POOL: PoolItem[] = [
  { id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }, { id: "f" },
];

function distinct(seq: string[]) { return new Set(seq).size; }
function maxConsec(seq: string[]) {
  let m = 1, c = 1;
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] === seq[i - 1]) { c++; m = Math.max(m, c); } else c = 1;
  }
  return m;
}

describe("composeSlotSequence — behavior profiles change distribution", () => {
  it("all 5 profiles are exposed and valid", () => {
    expect(Object.keys(BEHAVIOR_PROFILES).sort()).toEqual([
      "clinical_restriction",
      "high_adherence",
      "low_complexity",
      "standard",
      "strict_variation",
    ]);
  });

  it("strict_variation produces strictly more distinct items than low_complexity (averaged)", () => {
    let strict = 0, low = 0;
    for (let s = 0; s < 30; s++) {
      const a = composeSlotSequence({
        slotRole: "protein_lean", rotationPool: POOL,
        behaviorProfile: getBehaviorProfile("strict_variation"),
        seed: `s-${s}`,
      });
      const b = composeSlotSequence({
        slotRole: "protein_lean", rotationPool: POOL,
        behaviorProfile: getBehaviorProfile("low_complexity"),
        seed: `s-${s}`,
      });
      if (a.ok) strict += distinct(a.sequence);
      if (b.ok) low += distinct(b.sequence);
    }
    expect(strict).toBeGreaterThan(low);
  });

  it("high_adherence allows up to 5 consecutive repeats", () => {
    for (let s = 0; s < 50; s++) {
      const r = composeSlotSequence({
        slotRole: "protein_lean", rotationPool: POOL,
        behaviorProfile: getBehaviorProfile("high_adherence"),
        seed: `ha-${s}`,
      });
      expect(r.ok).toBe(true);
      if (r.ok) expect(maxConsec(r.sequence)).toBeLessThanOrEqual(5);
    }
  });

  it("metadata.behavior_profile reflects the profile actually used", () => {
    const r = composeSlotSequence({
      slotRole: "protein_lean", rotationPool: POOL,
      behaviorProfile: getBehaviorProfile("clinical_restriction"),
      seed: "x",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.metadata.behavior_profile).toBe("clinical_restriction");
  });
});
