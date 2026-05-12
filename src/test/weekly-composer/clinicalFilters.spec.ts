import { describe, it, expect } from "vitest";
import {
  composeSlotSequence,
  getBehaviorProfile,
} from "../../../supabase/functions/_shared/weekly-composer/index.ts";
import type { PoolItem } from "../../../supabase/functions/_shared/weekly-composer/types.ts";

const POOL: PoolItem[] = [
  { id: "frango",  name: "Frango grelhado", tags: ["ave", "frango"] },
  { id: "tilapia", name: "Tilápia",         tags: ["peixe"] },
  { id: "patinho", name: "Patinho bovino",  tags: ["carne_vermelha"] },
  { id: "ovos",    name: "Ovos cozidos",    tags: ["ovo"] },
  { id: "queijo",  name: "Queijo branco",   tags: ["lacteo"] },
];

describe("composeSlotSequence — clinical filtering", () => {
  it("allergy removes matching item and traces with reason='allergy'", () => {
    const r = composeSlotSequence({
      slotRole: "protein_lean", rotationPool: POOL,
      behaviorProfile: getBehaviorProfile("standard"),
      clinical: { allergies: ["peixe"] },
      seed: "x",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.sequence).not.toContain("tilapia");
      const f = r.metadata.filtered_items.find((i) => i.id === "tilapia");
      expect(f?.reason).toBe("allergy");
    }
  });

  it("religious + medical + dislike all filter independently", () => {
    const r = composeSlotSequence({
      slotRole: "protein_lean", rotationPool: POOL,
      behaviorProfile: getBehaviorProfile("standard"),
      clinical: {
        religious: ["carne_vermelha"],
        medical:   ["lacteo"],
        dislikes:  ["ovo"],
      },
      seed: "x",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const ids = new Set(r.sequence);
      expect(ids.has("patinho")).toBe(false);
      expect(ids.has("queijo")).toBe(false);
      expect(ids.has("ovos")).toBe(false);
      expect(ids.size).toBeGreaterThan(0);
      const reasons = r.metadata.filtered_items.map((f) => f.reason).sort();
      expect(reasons).toEqual(["dislike", "medical", "religious"]);
    }
  });

  it("hierarchy: allergy beats lower layers when both match", () => {
    const r = composeSlotSequence({
      slotRole: "protein_lean", rotationPool: POOL,
      behaviorProfile: getBehaviorProfile("standard"),
      clinical: { allergies: ["frango"], dislikes: ["frango"] },
      seed: "x",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const f = r.metadata.filtered_items.find((i) => i.id === "frango");
      expect(f?.reason).toBe("allergy");
    }
  });

  it("filtering is case- and accent-insensitive", () => {
    const r = composeSlotSequence({
      slotRole: "protein_lean", rotationPool: POOL,
      behaviorProfile: getBehaviorProfile("standard"),
      clinical: { allergies: ["TILÁPIA"] },
      seed: "x",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.sequence).not.toContain("tilapia");
  });

  it("clinical filter does not affect determinism for the surviving subset", () => {
    const a = composeSlotSequence({
      slotRole: "protein_lean", rotationPool: POOL,
      behaviorProfile: getBehaviorProfile("standard"),
      clinical: { dislikes: ["ovo"] },
      seed: "same",
    });
    const b = composeSlotSequence({
      slotRole: "protein_lean", rotationPool: POOL,
      behaviorProfile: getBehaviorProfile("standard"),
      clinical: { dislikes: ["ovo"] },
      seed: "same",
    });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.sequence).toEqual(b.sequence);
  });
});
