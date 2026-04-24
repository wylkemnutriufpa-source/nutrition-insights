/**
 * Verifies:
 *  1. Filling the offline queue past QUEUE_MAX_SIZE truncates to MAX
 *     and the UI surfaces the "queue full" warning.
 *  2. Items older than QUEUE_TTL_MS are pruned by pruneExpired() and
 *     the UI no longer shows them.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ExperienceModeStatusSection from "../ExperienceModeStatusSection";
import { ExperienceModeContext, type ExperienceModeContextValue } from "@/hooks/useExperienceMode";
import {
  enqueueAttempt,
  readQueue,
  pruneExpired,
  getQueueStats,
  QUEUE_MAX_SIZE,
  QUEUE_TTL_MS,
} from "@/lib/experienceModeTelemetry";

const auditInsertSpy = vi.fn(async (_payload: any) => ({ error: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u-q-1" } } })) },
    from: vi.fn(() => ({ insert: (arg: any) => auditInsertSpy(arg) })),
  },
}));

function makeCtx(over: Partial<ExperienceModeContextValue>): ExperienceModeContextValue {
  return {
    mode: "basic",
    setMode: async () => {},
    isRouteAllowed: () => true,
    isBasic: true,
    isPro: false,
    isAdvanced: false,
    isLoading: false,
    failedMode: "pro",
    lastError: Object.assign(new Error("offline"), {
      code: "OFFLINE" as const,
      correlationId: "emc-test-overflow",
    }),
    isOffline: true,
    pendingQueueSize: 0,
    queueStats: { size: 0, isFull: false, hasExpired: false, oldestQueuedAt: null },
    retryLastMode: vi.fn(),
    minMode: () => true,
    role: "patient",
    ...over,
  };
}

describe("Offline queue — overflow & TTL pruning + UI", () => {
  beforeEach(() => {
    localStorage.clear();
    auditInsertSpy.mockClear();
  });

  it("enqueueAttempt past QUEUE_MAX_SIZE truncates to MAX and audits queue_overflow; status shows 'Fila cheia'", async () => {
    // Pre-seed MAX_SIZE entries (with same mode is filtered by dedup, so seed
    // directly with distinct correlationIds + same mode for replicability).
    const seed = Array.from({ length: QUEUE_MAX_SIZE }, (_, i) => ({
      correlationId: `seed-${i}`,
      attemptedMode: "pro" as const,
      previousMode: "basic" as const,
      queuedAt: Date.now() - (QUEUE_MAX_SIZE - i) * 1000,
      retries: 0,
    }));
    localStorage.setItem("fj_experience_mode_queue", JSON.stringify(seed));

    // Push one MORE attempt (different mode so dedup keeps it). This forces overflow.
    const result = await enqueueAttempt({
      correlationId: "new-overflow",
      attemptedMode: "advanced",
      previousMode: "pro",
    });

    // Queue size is exactly MAX (oldest dropped).
    expect(readQueue().length).toBe(QUEUE_MAX_SIZE);
    expect(result.droppedForOverflow).not.toBeNull();
    expect(result.droppedForOverflow?.correlationId).toBe("seed-0");

    // Audit got a queue_overflow entry.
    const overflowCalls = auditInsertSpy.mock.calls
      .map((c: any) => c[0])
      .filter((c: any) => c.outcome === "queue_overflow");
    expect(overflowCalls.length).toBeGreaterThanOrEqual(1);

    // Compute stats and render the status section: it must show queue-full.
    const stats = getQueueStats();
    expect(stats.isFull).toBe(true);

    render(
      <ExperienceModeContext.Provider
        value={makeCtx({
          pendingQueueSize: stats.size,
          queueStats: stats,
        })}
      >
        <ExperienceModeStatusSection />
      </ExperienceModeContext.Provider>
    );

    expect(screen.getByTestId("emode-queue-full")).toBeInTheDocument();
    expect(screen.getByText(/Fila cheia/i)).toBeInTheDocument();
    // Status is in offline state
    expect(screen.getByTestId("emode-status").getAttribute("data-state")).toBe("offline");
  });

  it("pruneExpired removes items past TTL and the UI no longer shows hasExpired afterwards", async () => {
    const now = Date.now();
    const expiredAt = now - (QUEUE_TTL_MS + 60_000);
    const fresh = now - 1000;

    localStorage.setItem(
      "fj_experience_mode_queue",
      JSON.stringify([
        {
          correlationId: "expired-1",
          attemptedMode: "pro",
          previousMode: "basic",
          queuedAt: expiredAt,
          retries: 0,
        },
        {
          correlationId: "fresh-1",
          attemptedMode: "advanced",
          previousMode: "basic",
          queuedAt: fresh,
          retries: 0,
        },
      ])
    );

    // Before prune: stats report hasExpired=true.
    expect(getQueueStats().hasExpired).toBe(true);

    const { kept, expired } = await pruneExpired();
    expect(expired.map((e) => e.correlationId)).toEqual(["expired-1"]);
    expect(kept.map((k) => k.correlationId)).toEqual(["fresh-1"]);

    // Audit emitted a queue_expired entry for the dropped item.
    const expiredAudits = auditInsertSpy.mock.calls
      .map((c: any) => c[0])
      .filter((c: any) => c.outcome === "queue_expired");
    expect(expiredAudits.length).toBe(1);
    expect(expiredAudits[0].correlation_id).toBe("expired-1");

    // After prune: stats no longer report hasExpired=true.
    const statsAfter = getQueueStats();
    expect(statsAfter.hasExpired).toBe(false);
    expect(statsAfter.size).toBe(1);

    // UI: with cleaned stats, the "expired" hint must be GONE.
    render(
      <ExperienceModeContext.Provider
        value={makeCtx({
          pendingQueueSize: statsAfter.size,
          queueStats: statsAfter,
        })}
      >
        <ExperienceModeStatusSection />
      </ExperienceModeContext.Provider>
    );
    expect(screen.queryByTestId("emode-queue-expired")).not.toBeInTheDocument();
    expect(screen.queryByTestId("emode-queue-full")).not.toBeInTheDocument();
  });
});
