import { describe, it, expect } from "vitest";
import {
  composeSlotSequence,
  getBehaviorProfile,
} from "../../../supabase/functions/_shared/weekly-composer/index.ts";

describe("composeSlotSequence — pool exhaustion", () => {
  it("empty rotationPool returns POOL_EMPTY_INPUT, never silent fallback", () => {
    const r = composeSlotSequence({
      slotRole: "protein_lean",
      rotationPool: [],
      behaviorProfile: getBehaviorProfile("standard"),
      seed: "x",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) { const f = r;
      expect(f.reason).toBe("POOL_EMPTY_INPUT");
      expect(f.message).toMatch(/empty/i);
    }
  });

  it("clinical filter removing all items returns POOL_EMPTY_AFTER_FILTER", () => {
    const r = composeSlotSequence({
      slotRole: "protein_lean",
      rotationPool: [
        { id: "frango", name: "Frango", tags: ["frango"] },
        { id: "ovos",   name: "Ovos",   tags: ["ovo"] },
      ],
      behaviorProfile: getBehaviorProfile("standard"),
      clinical: { allergies: ["frango"], dislikes: ["ovo"] },
      seed: "x",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) { const f = r;
      expect(f.reason).toBe("POOL_EMPTY_AFTER_FILTER");
      expect(f.metadata.pool_size_after_filter).toBe(0);
      expect(f.metadata.filtered_items).toHaveLength(2);
    }
  });

  it("pool of 1 forces full repetition with forced_repeat=true on every trace", () => {
    const r = composeSlotSequence({
      slotRole: "protein_lean",
      rotationPool: [{ id: "frango" }],
      behaviorProfile: getBehaviorProfile("strict_variation"),
      seed: "x",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(new Set(r.sequence).size).toBe(1);
      expect(r.traces.every((t) => t.forced_repeat)).toBe(true);
    }
  });

  it("invalid days returns INVALID_DAYS", () => {
    const r = composeSlotSequence({
      slotRole: "protein_lean",
      rotationPool: [{ id: "x" }],
      behaviorProfile: getBehaviorProfile("standard"),
      seed: "x",
      days: 0,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(f.reason).toBe("INVALID_DAYS");
  });

  it("missing seed returns INVALID_BEHAVIOR_PROFILE branch", () => {
    const r = composeSlotSequence({
      slotRole: "protein_lean",
      rotationPool: [{ id: "x" }],
      behaviorProfile: getBehaviorProfile("standard"),
      seed: "",
    });
    expect(r.ok).toBe(false);
  });
});
