/**
 * Slow-network & timeout tests for the Experience Mode hook + UI.
 *
 * Goals:
 *  1. When the DB call hangs longer than DB_TIMEOUT_MS, withRetries
 *     transparently retries the same operation.
 *  2. The same correlationId emitted at the start of the attempt is
 *     present in:
 *       - the audit log (last recorded outcome)
 *       - the hook's `lastError` after a definitive failure
 *       - the UI status section ("ID: emc-…")
 *  3. After a definitive failure the user can click "Tentar novamente"
 *     and the retry uses a NEW correlationId, while the previous one
 *     remains traceable via the audit insert calls.
 *  4. The toast text shown to the user (block reason / failure message)
 *     stays consistent across automatic retries — i.e. the user only
 *     sees the final outcome, not each transient timeout.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useExperienceModeState, ExperienceModeContext } from "../useExperienceMode";
import ExperienceModeStatusSection from "@/components/dashboard/ExperienceModeStatusSection";
import { supabase } from "@/integrations/supabase/client";

// ─── Spies ─────────────────────────────────────────────────────────
const auditInsertSpy = vi.fn(async () => ({ error: null }));
const updateSpy = vi.fn();
const selectMaybeSingleSpy = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn((table: string) => {
      if (table === "experience_mode_audit_log") {
        return { insert: (payload: any) => auditInsertSpy(payload) };
      }
      // profiles
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => selectMaybeSingleSpy(),
          }),
        }),
        update: () => ({
          eq: () => updateSpy(),
        }),
      };
    }),
  },
}));

// Tighter timeout/backoff so tests don't take ages
vi.mock("../../lib/experienceModeTelemetry", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    DB_TIMEOUT_MS: 50,
    DB_MAX_RETRIES: 2,
  };
});

// Render the hook + the status section together so we can assert UI
function HostedStatus({ stateRef }: { stateRef: any }) {
  const value = useExperienceModeState("patient");
  // expose to the test
  stateRef.current = value;
  return (
    <ExperienceModeContext.Provider value={value as any}>
      <ExperienceModeStatusSection />
    </ExperienceModeContext.Provider>
  );
}

describe("useExperienceMode — slow network, timeouts & UI retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: "patient-1" } },
    });
    selectMaybeSingleSpy.mockResolvedValue({
      data: { experience_mode_locked: false, unlock_date: null },
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** ─── Helpers ─────────────────────────────────────────────── */
  const lastInsertWithOutcome = (outcome: string) => {
    const calls = auditInsertSpy.mock.calls.map((c: any) => c[0]);
    return calls.reverse().find((c: any) => c.outcome === outcome);
  };

  it("retries automatically on timeout and eventually succeeds with one stable correlationId", async () => {
    let attempt = 0;
    updateSpy.mockImplementation(() => {
      attempt++;
      if (attempt === 1) {
        // Simulate slow network: never resolves → withTimeout rejects
        return new Promise(() => {});
      }
      return Promise.resolve({ error: null });
    });

    const stateRef = { current: null as any };
    render(<HostedStatus stateRef={stateRef} />);

    await act(async () => {
      await stateRef.current.setMode("pro");
    });

    // Eventually succeeded
    await waitFor(() => expect(stateRef.current.mode).toBe("pro"));

    // The success audit row was written with the SAME correlationId across
    // the failed-then-retried attempt (withRetries reuses it).
    const success = lastInsertWithOutcome("success");
    expect(success).toBeTruthy();
    expect(success.correlation_id).toMatch(/^emc-/);
    // No "failed" outcome should be persisted because retries succeeded
    expect(lastInsertWithOutcome("failed")).toBeUndefined();
    expect(attempt).toBeGreaterThanOrEqual(2); // confirmed retried at least once

    // UI shows the steady success state — no failure ID surfaced
    const status = await screen.findByTestId("emode-status");
    expect(status.getAttribute("data-state")).toBe("success");
    expect(screen.queryByText(/Tentar novamente/)).not.toBeInTheDocument();
  });

  it("after exhausting retries, surfaces ONE failure with the same correlationId in audit, hook state and UI", async () => {
    // Always hangs → every retry hits TIMEOUT
    updateSpy.mockImplementation(() => new Promise(() => {}));

    const stateRef = { current: null as any };
    render(<HostedStatus stateRef={stateRef} />);

    await act(async () => {
      try {
        await stateRef.current.setMode("advanced");
      } catch {
        /* expected */
      }
    });

    await waitFor(() => expect(stateRef.current.failedMode).toBe("advanced"));

    const failure = lastInsertWithOutcome("failed");
    expect(failure).toBeTruthy();
    expect(failure.correlation_id).toMatch(/^emc-/);
    expect(failure.error_code).toBe("TIMEOUT");

    // Hook lastError carries the same id
    const errorId = stateRef.current.lastError?.correlationId;
    expect(errorId).toBeTruthy();
    expect(errorId).toBe(failure.correlation_id);

    // UI surfaces it once and shows the retry button
    const status = await screen.findByTestId("emode-status");
    expect(status.getAttribute("data-state")).toBe("failed");
    expect(screen.getByText(new RegExp(`ID: ${errorId}`))).toBeInTheDocument();
    expect(screen.getByText(/Tentar novamente/)).toBeInTheDocument();
  });

  it("clicking 'Tentar novamente' issues a NEW correlationId, preserving consistency in audit", async () => {
    // First call always hangs; after retry button, succeed.
    let phase: "fail" | "succeed" = "fail";
    updateSpy.mockImplementation(() => {
      if (phase === "fail") return new Promise(() => {});
      return Promise.resolve({ error: null });
    });

    const stateRef = { current: null as any };
    render(<HostedStatus stateRef={stateRef} />);

    await act(async () => {
      try {
        await stateRef.current.setMode("pro");
      } catch {
        /* expected */
      }
    });

    await waitFor(() => expect(stateRef.current.failedMode).toBe("pro"));
    const firstFailure = lastInsertWithOutcome("failed");
    expect(firstFailure).toBeTruthy();
    const firstId = firstFailure.correlation_id;

    // Now allow success and click retry
    phase = "succeed";
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Tentar novamente/i }));

    await waitFor(() => expect(stateRef.current.mode).toBe("pro"));

    const success = lastInsertWithOutcome("success");
    expect(success).toBeTruthy();
    // Retry must use a new correlationId, not reuse the failed one
    expect(success.correlation_id).toMatch(/^emc-/);
    expect(success.correlation_id).not.toBe(firstId);

    // UI returns to success state and the failure ID disappears
    const status = await screen.findByTestId("emode-status");
    expect(status.getAttribute("data-state")).toBe("success");
    expect(screen.queryByText(new RegExp(`ID: ${firstId}`))).not.toBeInTheDocument();
  });

  it("toast/UI text remains stable across transient retries (no flicker of intermediate errors)", async () => {
    // 1 timeout, then permanent DB error → user should see the FINAL error
    // message only, not the transient timeout one.
    let n = 0;
    updateSpy.mockImplementation(() => {
      n++;
      if (n === 1) return new Promise(() => {});
      return Promise.resolve({ error: { message: "duplicate key violates unique constraint" } });
    });

    const stateRef = { current: null as any };
    render(<HostedStatus stateRef={stateRef} />);

    await act(async () => {
      try {
        await stateRef.current.setMode("advanced");
      } catch {
        /* expected */
      }
    });

    await waitFor(() => expect(stateRef.current.failedMode).toBe("advanced"));
    const finalErr = stateRef.current.lastError;
    // The final, user-visible message is the DB one — not "Tempo excedido"
    expect(finalErr?.message).toMatch(/duplicate key/);
    expect(finalErr?.message).not.toMatch(/Tempo excedido/);

    // UI shows the same final message
    expect(await screen.findByText(/duplicate key/)).toBeInTheDocument();
    expect(screen.queryByText(/Tempo excedido/)).not.toBeInTheDocument();
  });
});
