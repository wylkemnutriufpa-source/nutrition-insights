import { describe, it, expect } from "vitest";
import { assertSovereignRuntime } from "../lib/runtimeGovernance";

// Mock de uma função legada
function normalizeFood() {
  assertSovereignRuntime("normalizeFoodMock");
  return "dirty data";
}

describe("Sovereign Runtime Guard", () => {
  it("blocks calls from forbidden patterns", () => {
    expect(() => normalizeFood()).toThrow("[SOVEREIGN_VIOLATION] Uso de motor legado detectado: normalizeFood");
  });

  it("allows safe calls", () => {
    const safeFunction = () => {
      assertSovereignRuntime("safeFunction");
      return "clean data";
    };
    expect(safeFunction()).toBe("clean data");
  });
});
