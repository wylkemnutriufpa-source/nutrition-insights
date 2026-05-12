/**
 * Sprint 1 — Testes do sistema de monitoring
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { logError, logWarn, getRecentErrors } from "@/lib/monitoring";

describe("Monitoring System", () => {
  it("logError adiciona entry ao buffer", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError("test", "Test error", { key: "val" });
    const errors = getRecentErrors();
    const last = errors[errors.length - 1];
    expect(last.level).toBe("error");
    expect(last.section).toBe("test");
    expect(last.message).toBe("Test error");
    expect(last.metadata).toEqual({ key: "val" });
    spy.mockRestore();
  });

  it("logWarn adiciona entry ao buffer", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logWarn("test", "Test warn");
    const errors = getRecentErrors();
    const last = errors[errors.length - 1];
    expect(last.level).toBe("warn");
    spy.mockRestore();
  });

  it("getRecentErrors retorna cópia imutável", () => {
    const a = getRecentErrors();
    const b = getRecentErrors();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
