import { describe, it, expect, beforeEach } from "vitest";
import {
  recordStateChange,
  recordDecision,
  getTelemetry,
  clearTelemetry,
  detectLoop,
} from "../governanceTelemetry";
import type { GovernanceContext } from "../governance";

const baseCtx = (over: Partial<GovernanceContext> = {}): GovernanceContext => ({
  pathname: "/anamnesis",
  user: { id: "u1" },
  profile: { id: "u1", tenant_id: "t1" },
  journeyStatus: "anamnesis",
  hasConsent: true,
  mode: "basic",
  role: "patient",
  isReady: true,
  isDegraded: false,
  ...over,
});

describe("Governance Telemetry", () => {
  beforeEach(() => clearTelemetry());

  it("records state changes with from/to/source", () => {
    recordStateChange({ userId: "u1", from: "anamnesis", to: "active_plan", source: "realtime" });
    const events = getTelemetry();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "state_change",
      userId: "u1",
      from: "anamnesis",
      to: "active_plan",
      source: "realtime",
    });
  });

  it("records governance decisions with state→route mapping", () => {
    recordDecision(baseCtx(), {
      type: "REDIRECT",
      target: "/consent",
      reason: "needs consent",
    });
    const events = getTelemetry();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "decision",
      pathname: "/anamnesis",
      decision: "REDIRECT",
      target: "/consent",
    });
  });

  it("detectLoop returns true when more than 5 redirects happen within 2s for the same user", () => {
    for (let i = 0; i < 6; i++) {
      recordDecision(baseCtx(), { type: "REDIRECT", target: "/consent", reason: "loop" });
    }
    expect(detectLoop("u1")).toBe(true);
  });

  it("detectLoop is false for ALLOW-only events", () => {
    for (let i = 0; i < 10; i++) {
      recordDecision(baseCtx(), { type: "ALLOW", reason: "ok" });
    }
    expect(detectLoop("u1")).toBe(false);
  });

  it("buffer is bounded (does not grow without limit)", () => {
    for (let i = 0; i < 500; i++) {
      recordStateChange({ userId: "u1", from: "a", to: "b", source: "test" });
    }
    expect(getTelemetry().length).toBeLessThanOrEqual(200);
  });
});
