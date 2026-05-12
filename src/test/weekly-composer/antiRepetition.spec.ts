import { describe, it, expect } from "vitest";
import {
  composeSlotSequence,
  getBehaviorProfile,
} from "../../../supabase/functions/_shared/weekly-composer/index.ts";
import type { PoolItem } from "../../../supabase/functions/_shared/weekly-composer/types.ts";

const POOL: PoolItem[] = [
  { id: "frango" },
  { id: "tilapia" },
  { id: "patinho" },
  { id: "ovos" },
  { id: "atum" },
];

function maxConsecutive(seq: string[]): number {
  let max = 1, cur = 1;
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] === seq[i - 1]) { cur++; max = Math.max(max, cur); }
    else cur = 1;
  }
  return max;
}

describe("composeSlotSequence — anti-repetition", () => {
  it("strict_variation never repeats consecutively", () => {
    for (let s = 0; s < 50; s++) {
      const r = composeSlotSequence({
        slotRole: "protein_lean",
        rotationPool: POOL,
        behaviorProfile: getBehaviorProfile("strict_variation"),
        seed: `seed-${s}`,
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(maxConsecutive(r.sequence)).toBeLessThanOrEqual(1);
        expect(r.metadata.repeat_violations).toBe(0);
      }
    }
  });

  it("standard respects maxRepeatConsecutive=3", () => {
    for (let s = 0; s < 50; s++) {
      const r = composeSlotSequence({
        slotRole: "protein_lean",
        rotationPool: POOL,
        behaviorProfile: getBehaviorProfile("standard"),
        seed: `std-${s}`,
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(maxConsecutive(r.sequence)).toBeLessThanOrEqual(3);
      }
    }
  });

  it("low_complexity may repeat the same item all 7 days when pool is rich", () => {
    // Pool of 1 forces full repetition; pool of many + low_complexity rarely
    // diversifies. Just assert it does not throw and bounds hold.
    const r = composeSlotSequence({
      slotRole: "protein_lean",
      rotationPool: POOL,
      behaviorProfile: getBehaviorProfile("low_complexity"),
      seed: "low",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(maxConsecutive(r.sequence)).toBeLessThanOrEqual(7);
  });

  it("strict_variation reaches minDistinctPerWeek when pool is rich enough", () => {
    const r = composeSlotSequence({
      slotRole: "protein_lean",
      rotationPool: POOL,
      behaviorProfile: getBehaviorProfile("strict_variation"),
      seed: "distinct",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.metadata.distinct_count).toBeGreaterThanOrEqual(
        getBehaviorProfile("strict_variation").minDistinctPerWeek,
      );
    }
  });
});
