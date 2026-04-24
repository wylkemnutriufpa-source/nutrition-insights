/**
 * Tests for new behaviors:
 * - Queue overflow (MAX_SIZE) drops oldest and audits queue_overflow
 * - Queue TTL expiration via pruneExpired audits queue_expired
 * - withTimeout rejects with code TIMEOUT preserving consistency
 * - withRetries retries on TIMEOUT and stops on MODE_LOCKED
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  enqueueAttempt,
  readQueue,
  pruneExpired,
  getQueueStats,
  withTimeout,
  withRetries,
  QUEUE_MAX_SIZE,
} from "../experienceModeTelemetry";

const insertSpy = vi.fn(async () => ({ error: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } } })) },
    from: vi.fn(() => ({ insert: (...a: any[]) => insertSpy(...a) })),
  },
}));

describe("experienceModeTelemetry — limits, TTL, timeout & retries", () => {
  beforeEach(() => {
    localStorage.clear();
    insertSpy.mockClear();
  });

  it("enqueueAttempt drops oldest and audits queue_overflow when full", async () => {
    for (let i = 0; i < QUEUE_MAX_SIZE; i++) {
      // Use distinct attemptedMode values by alternating — dedup by mode means
      // we need to bypass dedup; we simulate by manually pushing different modes.
      // Since only 3 modes exist, we instead seed the queue directly.
    }
    // Seed queue manually with MAX_SIZE entries having same mode is impossible
    // due to dedup; seed with different correlationIds via direct localStorage.
    const seed = Array.from({ length: QUEUE_MAX_SIZE }, (_, i) => ({
      correlationId: `seed-${i}`,
      attemptedMode: "pro",
      previousMode: "basic",
      queuedAt: Date.now() - i * 1000,
      retries: 0,
    }));
    localStorage.setItem("fj_experience_mode_queue", JSON.stringify(seed));

    // Now enqueue an "advanced" attempt — pushes us to MAX_SIZE+1 → overflow.
    const result = await enqueueAttempt({
      correlationId: "new-1",
      attemptedMode: "advanced",
      previousMode: "pro",
    });
    expect(result.droppedForOverflow).not.toBeNull();
    expect(readQueue().length).toBe(QUEUE_MAX_SIZE);
    // Audit insert called with queue_overflow
    const calls = insertSpy.mock.calls.map((c) => c[0]);
    expect(calls.some((c: any) => c.outcome === "queue_overflow")).toBe(true);
  });

  it("pruneExpired removes items past TTL and audits queue_expired", async () => {
    const old = Date.now() - (24 * 60 * 60 * 1000 + 60_000); // > 24h
    const fresh = Date.now() - 1000;
    localStorage.setItem(
      "fj_experience_mode_queue",
      JSON.stringify([
        { correlationId: "old", attemptedMode: "pro", previousMode: "basic", queuedAt: old, retries: 0 },
        { correlationId: "new", attemptedMode: "advanced", previousMode: "basic", queuedAt: fresh, retries: 0 },
      ])
    );
    const { kept, expired } = await pruneExpired();
    expect(expired.map((e) => e.correlationId)).toEqual(["old"]);
    expect(kept.map((k) => k.correlationId)).toEqual(["new"]);
    const calls = insertSpy.mock.calls.map((c) => c[0]);
    expect(calls.some((c: any) => c.outcome === "queue_expired")).toBe(true);
  });

  it("getQueueStats reports isFull and hasExpired", () => {
    const old = Date.now() - (24 * 60 * 60 * 1000 + 5000);
    const seed = Array.from({ length: QUEUE_MAX_SIZE }, (_, i) => ({
      correlationId: `s-${i}`,
      attemptedMode: "pro",
      previousMode: "basic",
      queuedAt: i === 0 ? old : Date.now(),
      retries: 0,
    }));
    localStorage.setItem("fj_experience_mode_queue", JSON.stringify(seed));
    const stats = getQueueStats();
    expect(stats.isFull).toBe(true);
    expect(stats.hasExpired).toBe(true);
  });

  it("withTimeout rejects with code TIMEOUT when promise hangs", async () => {
    const hung = new Promise(() => {});
    await expect(withTimeout(hung as any, 20)).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("withRetries retries on TIMEOUT and eventually succeeds", async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      n++;
      if (n < 2) {
        const e: any = new Error("slow");
        e.code = "TIMEOUT";
        throw e;
      }
      return "ok";
    });
    const out = await withRetries(fn, { correlationId: "emc-x", maxRetries: 3, baseDelayMs: 1 });
    expect(out).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("withRetries does NOT retry on MODE_LOCKED", async () => {
    const fn = vi.fn(async () => {
      const e: any = new Error("locked");
      e.code = "MODE_LOCKED";
      throw e;
    });
    await expect(
      withRetries(fn, { correlationId: "emc-y", maxRetries: 3, baseDelayMs: 1 })
    ).rejects.toMatchObject({ code: "MODE_LOCKED" });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
