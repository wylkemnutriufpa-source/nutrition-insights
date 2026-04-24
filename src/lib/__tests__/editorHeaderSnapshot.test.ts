import { describe, it, expect } from "vitest";
import {
  resolveHeaderSnapshot,
  calcDayTotals,
  getDayLabel,
} from "../editorHeaderSnapshot";

const mk = (
  day: number,
  meal: string,
  cals = 100,
  prot = 10,
  carbs = 20,
  fat = 5
) =>
  ({
    day_of_week: day,
    meal_type: meal,
    calories_target: cals,
    protein_target: prot,
    carbs_target: carbs,
    fat_target: fat,
  } as any);

describe("editorHeaderSnapshot", () => {
  describe("getDayLabel", () => {
    it("returns PT-BR labels for 0..6", () => {
      expect(getDayLabel(0)).toBe("Domingo");
      expect(getDayLabel(1)).toBe("Segunda");
      expect(getDayLabel(6)).toBe("Sábado");
    });

    it("returns generic label when day is out of range", () => {
      expect(getDayLabel(99)).toBe("Dia 99");
    });
  });

  describe("calcDayTotals", () => {
    it("returns zeros when no items match the day", () => {
      const totals = calcDayTotals([mk(1, "lunch")], 0);
      expect(totals).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    });

    it("aggregates only items belonging to the requested day", () => {
      const items = [
        mk(0, "breakfast", 200, 15, 30, 5),
        mk(0, "lunch", 500, 40, 50, 15),
        mk(1, "dinner", 999, 99, 99, 99), // ignored
      ];
      expect(calcDayTotals(items, 0)).toEqual({
        calories: 700,
        protein: 55,
        carbs: 80,
        fat: 20,
      });
    });

    it("coerces string macro fields", () => {
      const items = [
        {
          day_of_week: 0,
          meal_type: "lunch",
          calories_target: "300",
          protein_target: "20",
          carbs_target: "40",
          fat_target: "10",
        } as any,
      ];
      expect(calcDayTotals(items, 0)).toEqual({
        calories: 300,
        protein: 20,
        carbs: 40,
        fat: 10,
      });
    });
  });

  describe("resolveHeaderSnapshot — label/totals always match effectiveDay", () => {
    it("uses day 0 when items exist on day 0 (canonical)", () => {
      const items = [mk(0, "lunch", 500, 40, 50, 15)];
      const snap = resolveHeaderSnapshot(items);
      expect(snap.effectiveDay).toBe(0);
      expect(snap.effectiveDayLabel).toBe("Domingo");
      expect(snap.showingLegacy).toBe(false);
      expect(snap.totals).toEqual({ calories: 500, protein: 40, carbs: 50, fat: 15 });
    });

    it("falls back to first legacy day with items and totals reflect that day", () => {
      const items = [
        mk(1, "breakfast", 200, 15, 30, 5),
        mk(1, "lunch", 600, 50, 60, 20),
        mk(3, "dinner", 999, 99, 99, 99), // not the first legacy day
      ];
      const snap = resolveHeaderSnapshot(items);
      expect(snap.effectiveDay).toBe(1);
      expect(snap.effectiveDayLabel).toBe("Segunda");
      expect(snap.showingLegacy).toBe(true);
      // Totals must come from day 1 ONLY — never mixing other days.
      expect(snap.totals).toEqual({ calories: 800, protein: 65, carbs: 90, fat: 25 });
    });

    it("forceCanonical=true: label and totals lock to day 0 even if empty", () => {
      const items = [mk(2, "lunch", 999, 50, 60, 20)];
      const snap = resolveHeaderSnapshot(items, { forceCanonical: true });
      expect(snap.effectiveDay).toBe(0);
      expect(snap.effectiveDayLabel).toBe("Domingo");
      expect(snap.showingLegacy).toBe(false);
      // Day 0 has no items → totals must be zero (NOT from legacy day).
      expect(snap.totals).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    });

    it("toggling forceCanonical flips both label and totals consistently", () => {
      const items = [
        mk(0, "lunch", 500, 40, 50, 15),
        mk(2, "lunch", 800, 60, 70, 25),
      ];

      // With force: stays at day 0 → totals from day 0
      const forced = resolveHeaderSnapshot(items, { forceCanonical: true });
      expect(forced.effectiveDay).toBe(0);
      expect(forced.totals.calories).toBe(500);

      // Without force: still day 0 (canonical wins when populated)
      const auto = resolveHeaderSnapshot(items, { forceCanonical: false });
      expect(auto.effectiveDay).toBe(0);
      expect(auto.totals.calories).toBe(500);
    });

    it("when day 0 is empty and forceCanonical=false, label reflects legacy day exactly", () => {
      const items = [mk(4, "breakfast", 250, 20, 30, 8)];
      const snap = resolveHeaderSnapshot(items, { forceCanonical: false });
      expect(snap.effectiveDay).toBe(4);
      expect(snap.effectiveDayLabel).toBe("Quinta");
      expect(snap.showingLegacy).toBe(true);
      expect(snap.totals.calories).toBe(250);
    });

    it("never returns totals from a day other than the labeled one (invariant)", () => {
      // Stress test across all permutations: label day === totals day
      const buckets = [
        [mk(0, "lunch", 100)],
        [mk(1, "lunch", 200)],
        [mk(0, "lunch", 100), mk(1, "lunch", 200), mk(3, "dinner", 300)],
        [mk(5, "lunch", 400), mk(2, "dinner", 500)],
      ];
      for (const items of buckets) {
        const snap = resolveHeaderSnapshot(items);
        const labeled = calcDayTotals(items, snap.effectiveDay);
        expect(snap.totals).toEqual(labeled);
      }
    });
  });
});
