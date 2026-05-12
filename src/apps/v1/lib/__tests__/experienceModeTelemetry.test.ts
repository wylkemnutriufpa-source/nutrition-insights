/**
 * Tests for experienceModeTelemetry: correlationId generation,
 * block reason builder (with/without unlock_date), offline queue.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateCorrelationId,
  buildBlockReason,
  enqueueAttempt,
  readQueue,
  clearQueue,
  removeFromQueue,
  drainQueue,
} from "../experienceModeTelemetry";

vi.mock("@v1/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } } })) },
    from: vi.fn(() => ({ insert: vi.fn(async () => ({ error: null })) })),
  },
}));

describe("experienceModeTelemetry", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("generateCorrelationId returns unique-looking ids with emc- prefix", () => {
    const a = generateCorrelationId();
    const b = generateCorrelationId();
    expect(a).toMatch(/^emc-/);
    expect(b).toMatch(/^emc-/);
    expect(a).not.toBe(b);
  });

  it("buildBlockReason includes condition for Profissional", () => {
    const r = buildBlockReason({ attemptedMode: "pro" });
    expect(r.title).toContain("Profissional");
    expect(r.description).toMatch(/atualização clínica obrigatória/i);
  });

  it("buildBlockReason includes unlock date when provided", () => {
    const unlock = new Date("2030-06-15T00:00:00Z").toISOString();
    const r = buildBlockReason({ attemptedMode: "advanced", unlockDate: unlock });
    expect(r.title).toContain("Avançado");
    expect(r.description).toMatch(/Liberação prevista para/);
    expect(r.description).toMatch(/15\/06\/2030|14\/06\/2030/); // tz-tolerant
  });

  it("buildBlockReason omits date phrase when not provided", () => {
    const r = buildBlockReason({ attemptedMode: "pro" });
    expect(r.description).not.toMatch(/Liberação prevista/);
  });

  it("enqueueAttempt persists into localStorage and dedups by mode", async () => {
    await enqueueAttempt({ correlationId: "c1", attemptedMode: "pro", previousMode: "basic" });
    await enqueueAttempt({ correlationId: "c2", attemptedMode: "pro", previousMode: "basic" });
    await enqueueAttempt({ correlationId: "c3", attemptedMode: "advanced", previousMode: "pro" });
    const q = readQueue();
    expect(q).toHaveLength(2);
    expect(q.find((i) => i.attemptedMode === "pro")?.correlationId).toBe("c2");
  });

  it("removeFromQueue and clearQueue work", async () => {
    await enqueueAttempt({ correlationId: "c1", attemptedMode: "pro", previousMode: "basic" });
    removeFromQueue("c1");
    expect(readQueue()).toHaveLength(0);
    await enqueueAttempt({ correlationId: "c2", attemptedMode: "advanced", previousMode: "basic" });
    clearQueue();
    expect(readQueue()).toHaveLength(0);
  });

  it("drainQueue replays each attempt and removes successful ones", async () => {
    await enqueueAttempt({ correlationId: "c1", attemptedMode: "pro", previousMode: "basic" });
    await enqueueAttempt({ correlationId: "c2", attemptedMode: "advanced", previousMode: "pro" });
    const replay = vi.fn(async (_item) => {});
    const res = await drainQueue(replay);
    expect(res.replayed).toBe(2);
    expect(res.failed).toBe(0);
    expect(replay).toHaveBeenCalledTimes(2);
    expect(readQueue()).toHaveLength(0);
  });

  it("drainQueue keeps failed attempts in the queue and increments retries", async () => {
    await enqueueAttempt({ correlationId: "c1", attemptedMode: "pro", previousMode: "basic" });
    const replay = vi.fn(async () => {
      throw new Error("network");
    });
    const res = await drainQueue(replay);
    expect(res.failed).toBe(1);
    const q = readQueue();
    expect(q).toHaveLength(1);
    expect(q[0].retries).toBe(1);
  });

  it("drainQueue replays each attempt and removes successful ones", async () => {
    await enqueueAttempt({ correlationId: "c1", attemptedMode: "pro", previousMode: "basic" });
    await enqueueAttempt({ correlationId: "c2", attemptedMode: "advanced", previousMode: "pro" });
    const replay = vi.fn(async (_item) => {});
    const res = await drainQueue(replay);
    expect(res.replayed).toBe(2);
    expect(res.failed).toBe(0);
    expect(replay).toHaveBeenCalledTimes(2);
    expect(readQueue()).toHaveLength(0);
  });

  it("drainQueue keeps failed attempts in the queue and increments retries", async () => {
    await enqueueAttempt({ correlationId: "c1", attemptedMode: "pro", previousMode: "basic" });
    const replay = vi.fn(async () => {
      throw new Error("network");
    });
    const res = await drainQueue(replay);
    expect(res.failed).toBe(1);
    const q = readQueue();
    expect(q).toHaveLength(1);
    expect(q[0].retries).toBe(1);
  });
});
