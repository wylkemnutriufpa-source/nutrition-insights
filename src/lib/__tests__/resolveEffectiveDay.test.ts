import { describe, it, expect } from "vitest";
import { resolveEffectiveDay, hasLegacyDayItems } from "../resolveEffectiveDay";

const mk = (...days: number[]) => days.map((d) => ({ day_of_week: d }));

describe("resolveEffectiveDay", () => {
  it("returns 0 when items exist on day 0 (canonical)", () => {
    expect(resolveEffectiveDay(mk(0, 0, 0))).toBe(0);
  });

  it("returns 0 when items exist on both day 0 and legacy days", () => {
    expect(resolveEffectiveDay(mk(0, 1, 2))).toBe(0);
  });

  it("falls back to day 1 when day 0 is empty", () => {
    expect(resolveEffectiveDay(mk(1, 1, 2))).toBe(1);
  });

  it("falls back through 1..6 in order", () => {
    expect(resolveEffectiveDay(mk(3))).toBe(3);
    expect(resolveEffectiveDay(mk(6))).toBe(6);
    expect(resolveEffectiveDay(mk(2, 5))).toBe(2);
  });

  it("returns 0 when there are no items", () => {
    expect(resolveEffectiveDay([])).toBe(0);
  });

  it("forceCanonical always returns 0 even if day 0 is empty", () => {
    expect(resolveEffectiveDay(mk(1, 2, 3), { forceCanonical: true })).toBe(0);
    expect(resolveEffectiveDay([], { forceCanonical: true })).toBe(0);
  });

  it("ignores nullish day_of_week", () => {
    const items = [{ day_of_week: null }, { day_of_week: undefined }, { day_of_week: 4 }];
    expect(resolveEffectiveDay(items)).toBe(4);
  });
});

describe("hasLegacyDayItems", () => {
  it("returns false when only day 0 has items", () => {
    expect(hasLegacyDayItems(mk(0, 0))).toBe(false);
  });

  it("returns true when any item is on day 1..6", () => {
    expect(hasLegacyDayItems(mk(0, 1))).toBe(true);
    expect(hasLegacyDayItems(mk(6))).toBe(true);
  });

  it("returns false for empty list", () => {
    expect(hasLegacyDayItems([])).toBe(false);
  });
});
