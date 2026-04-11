import { describe, it, expect } from "vitest";
import {
  normalizeHeightInput,
  normalizeWeightInput,
  normalizeWaterInput,
  normalizeSleepInput,
  normalizeMeasurementInput,
  normalizeBodyFatInput,
  normalizeNumericInput,
} from "@/lib/normalizeInputs";

describe("normalizeHeightInput", () => {
  it("accepts plain cm", () => {
    const r = normalizeHeightInput("158");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(158);
  });

  it("interprets meters with comma as cm", () => {
    const r = normalizeHeightInput("1,58");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(158);
    expect(r.wasCorrected).toBe(true);
  });

  it("interprets meters with dot as cm", () => {
    const r = normalizeHeightInput("1.58");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(158);
    expect(r.wasCorrected).toBe(true);
  });

  it("handles unit suffix '1,58m'", () => {
    const r = normalizeHeightInput("1,58m");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(158);
  });

  it("handles '1.58 m'", () => {
    const r = normalizeHeightInput("1.58 m");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(158);
  });

  it("handles '158 cm'", () => {
    const r = normalizeHeightInput("158 cm");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(158);
  });

  it("rejects out-of-range value", () => {
    expect(normalizeHeightInput("500").isValid).toBe(false);
    expect(normalizeHeightInput("10").isValid).toBe(false);
  });

  it("rejects empty", () => {
    expect(normalizeHeightInput("").isValid).toBe(false);
  });

  it("rejects garbage", () => {
    expect(normalizeHeightInput("abc").isValid).toBe(false);
  });
});

describe("normalizeWeightInput", () => {
  it("accepts plain number", () => {
    const r = normalizeWeightInput("70");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(70);
  });

  it("accepts comma decimal", () => {
    const r = normalizeWeightInput("70,5");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(70.5);
  });

  it("handles unit suffix", () => {
    const r = normalizeWeightInput("70.5 kg");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(70.5);
  });

  it("handles '70kg'", () => {
    const r = normalizeWeightInput("70kg");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(70);
  });

  it("rejects out-of-range", () => {
    expect(normalizeWeightInput("5").isValid).toBe(false);
    expect(normalizeWeightInput("500").isValid).toBe(false);
  });
});

describe("normalizeWaterInput", () => {
  it("accepts cups", () => {
    const r = normalizeWaterInput("8");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(8);
  });

  it("converts liters to cups", () => {
    const r = normalizeWaterInput("2 litros");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(8);
    expect(r.wasCorrected).toBe(true);
  });

  it("converts ml to cups", () => {
    const r = normalizeWaterInput("2000");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(8);
    expect(r.wasCorrected).toBe(true);
  });
});

describe("normalizeSleepInput", () => {
  it("accepts hours", () => {
    const r = normalizeSleepInput("7");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(7);
  });

  it("accepts decimal hours with comma", () => {
    const r = normalizeSleepInput("7,5");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(7.5);
  });

  it("converts minutes to hours", () => {
    const r = normalizeSleepInput("420");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(7);
    expect(r.wasCorrected).toBe(true);
  });
});

describe("normalizeMeasurementInput", () => {
  it("accepts cm value", () => {
    const r = normalizeMeasurementInput("85");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(85);
  });

  it("handles comma decimal", () => {
    const r = normalizeMeasurementInput("85,5");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(85.5);
  });

  it("rejects out-of-range", () => {
    expect(normalizeMeasurementInput("0").isValid).toBe(false);
    expect(normalizeMeasurementInput("300").isValid).toBe(false);
  });
});

describe("normalizeBodyFatInput", () => {
  it("accepts percentage", () => {
    const r = normalizeBodyFatInput("22");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(22);
  });

  it("handles % symbol", () => {
    const r = normalizeBodyFatInput("22,5%");
    expect(r.isValid).toBe(true);
    expect(r.value).toBe(22.5);
  });

  it("rejects out-of-range", () => {
    expect(normalizeBodyFatInput("1").isValid).toBe(false);
    expect(normalizeBodyFatInput("70").isValid).toBe(false);
  });
});

describe("normalizeNumericInput", () => {
  it("handles comma decimal", () => {
    expect(normalizeNumericInput("70,5")).toBe(70.5);
  });

  it("handles empty", () => {
    expect(normalizeNumericInput("")).toBe(null);
  });
});
