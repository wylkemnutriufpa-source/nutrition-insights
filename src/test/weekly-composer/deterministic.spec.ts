import { describe, it, expect } from "vitest";
import {
  composeSlotSequence,
  getBehaviorProfile,
} from "../../../supabase/functions/_shared/weekly-composer/index.ts";
import type { PoolItem } from "../../../supabase/functions/_shared/weekly-composer/types.ts";

const POOL: PoolItem[] = [
  { id: "frango",  name: "Frango grelhado" },
  { id: "tilapia", name: "Tilápia" },
  { id: "patinho", name: "Patinho" },
  { id: "ovos",    name: "Ovos" },
];

describe("composeSlotSequence — determinism", () => {
  it("same input produces byte-equal output (1000x)", () => {
    const ref = composeSlotSequence({
      slotRole: "protein_lean",
      rotationPool: POOL,
      behaviorProfile: getBehaviorProfile("standard"),
      seed: "plan-A|patient-1|tpl-9|v1",
    });
    expect(ref.ok).toBe(true);
    if (!ref.ok) return;

    for (let i = 0; i < 1000; i++) {
      const r = composeSlotSequence({
        slotRole: "protein_lean",
        rotationPool: POOL,
        behaviorProfile: getBehaviorProfile("standard"),
        seed: "plan-A|patient-1|tpl-9|v1",
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.sequence).toEqual(ref.sequence);
    }
  });

  it("different seed yields different sequence", () => {
    const a = composeSlotSequence({
      slotRole: "protein_lean",
      rotationPool: POOL,
      behaviorProfile: getBehaviorProfile("standard"),
      seed: "seed-A",
    });
    const b = composeSlotSequence({
      slotRole: "protein_lean",
      rotationPool: POOL,
      behaviorProfile: getBehaviorProfile("standard"),
      seed: "seed-B",
    });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.sequence).not.toEqual(b.sequence);
    }
  });

  it("different slot role with same seed yields independent stream", () => {
    const a = composeSlotSequence({
      slotRole: "protein_lean",
      rotationPool: POOL,
      behaviorProfile: getBehaviorProfile("standard"),
      seed: "shared-seed",
    });
    const b = composeSlotSequence({
      slotRole: "carb_complex",
      rotationPool: POOL,
      behaviorProfile: getBehaviorProfile("standard"),
      seed: "shared-seed",
    });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.sequence).not.toEqual(b.sequence);
  });

  it("output length equals requested days (default 7)", () => {
    const r = composeSlotSequence({
      slotRole: "protein_lean",
      rotationPool: POOL,
      behaviorProfile: getBehaviorProfile("standard"),
      seed: "x",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.sequence).toHaveLength(7);
      expect(r.traces).toHaveLength(7);
      expect(r.metadata.seed_used).toBe("x");
    }
  });
});
