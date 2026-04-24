/**
 * Slow-network & timeout tests for the Experience Mode hook + UI.
 *
 * We don't rely on real timeouts — the DB mock directly throws a
 * TIMEOUT-coded error to simulate a slow network. This isolates the
 * behaviour we actually want to verify:
 *
 *  1. withRetries retries the same operation transparently.
 *  2. The same correlationId is propagated end-to-end (audit log,
 *     hook `lastError`, and the UI status section "ID: emc-…").
 *  3. After exhausting retries, the user sees ONE final error with
 *     the right correlationId and a working "Tentar novamente" button.
 *  4. Clicking retry issues a NEW correlationId; the previous one is
 *     still traceable in the audit insert calls.
 *  5. The user-facing message is the FINAL error — never the
 *     transient "Tempo excedido" intermediate one.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import { useExperienceModeState, ExperienceModeContext } from "../useExperienceMode";
import ExperienceModeStatusSection from "@/components/dashboard/ExperienceModeStatusSection";
import { supabase } from "@/integrations/supabase/client";

// ─── Spies ─────────────────────────────────────────────────────────
const auditInsertSpy = vi.fn(async (_payload: any) => ({ error: null }));
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
    from: vi.fn((...args: any[]) => {
      const table = args[0];
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

/** Build a TIMEOUT-coded error matching what withTimeout would throw. */
function timeoutError(): any {
  const e: any = new Error("Tempo excedido (50ms)");
  e.code = "TIMEOUT";
  return e;
}

// Render hook + status section together, exposing the hook's value.
function HostedStatus({ stateRef }: { stateRef: any }) {
  const value = useExperienceModeState("patient");
  stateRef.current = value;
  return (
    <ExperienceModeContext.Provider value={value as any}>
      <ExperienceModeStatusSection />
    </ExperienceModeContext.Provider>
  );
}

const lastInsertWithOutcome = (outcome: string) => {
  const calls = auditInsertSpy.mock.calls.map((c: any) => c[0]);
  return [...calls].reverse().find((c: any) => c.outcome === outcome);
};

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

  it("retries automatically on timeout and eventually succeeds with one stable correlationId", async () => {
    let attempt = 0;
    updateSpy.mockImplementation(() => {
      attempt++;
      if (attempt === 1) return Promise.reject(timeoutError());
      return Promise.resolve({ error: null });
    });

    const stateRef = { current: null as any };
    render(<HostedStatus stateRef={stateRef} />);
    await waitFor(() => expect(stateRef.current).not.toBeNull());

    await act(async () => {
      await stateRef.current.setMode("pro");
    });

    await waitFor(() => expect(stateRef.current.mode).toBe("pro"));

    // The success row carries a correlationId that traces back to the same
    // attempt: withRetries reused it, so no separate "failed" row exists.
    const success = lastInsertWithOutcome("success");
    expect(success).toBeTruthy();
    expect(success.correlation_id).toMatch(/^emc-/);
    expect(lastInsertWithOutcome("failed")).toBeUndefined();
    expect(attempt).toBeGreaterThanOrEqual(2); // retried at least once

    // UI shows steady success — no failure ID, no retry button
    const status = await screen.findByTestId("emode-status");
    expect(status.getAttribute("data-state")).toBe("success");
    expect(screen.queryByText(/Tentar novamente/)).not.toBeInTheDocument();
  });

  it("after exhausting retries, surfaces ONE failure with the same correlationId in audit, hook and UI", async () => {
    updateSpy.mockImplementation(() => Promise.reject(timeoutError()));

    const stateRef = { current: null as any };
    render(<HostedStatus stateRef={stateRef} />);
    await waitFor(() => expect(stateRef.current).not.toBeNull());

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

    // Hook lastError carries the same id as the audit row
    const errorId = stateRef.current.lastError?.correlationId;
    expect(errorId).toBeTruthy();
    expect(errorId).toBe(failure.correlation_id);

    // UI surfaces the failure with that very ID + a retry button
    const status = await screen.findByTestId("emode-status");
    expect(status.getAttribute("data-state")).toBe("failed");
    expect(screen.getByText(new RegExp(`ID: ${errorId}`))).toBeInTheDocument();
    expect(screen.getByText(/Tentar novamente/)).toBeInTheDocument();
  });

  it("clicking 'Tentar novamente' issues a NEW correlationId, while the previous one stays in audit", async () => {
    let phase: "fail" | "succeed" = "fail";
    updateSpy.mockImplementation(() => {
      if (phase === "fail") return Promise.reject(timeoutError());
      return Promise.resolve({ error: null });
    });

    const stateRef = { current: null as any };
    render(<HostedStatus stateRef={stateRef} />);
    await waitFor(() => expect(stateRef.current).not.toBeNull());

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
    const firstId: string = firstFailure.correlation_id;

    // Allow success and click retry
    phase = "succeed";
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/i }));
    });

    await waitFor(() => expect(stateRef.current.mode).toBe("pro"));

    const success = lastInsertWithOutcome("success");
    expect(success).toBeTruthy();
    expect(success.correlation_id).toMatch(/^emc-/);
    // New attempt — different id from the failed one
    expect(success.correlation_id).not.toBe(firstId);

    // Both ids are still recoverable in the audit history
    const allIds = auditInsertSpy.mock.calls.map((c: any) => c[0].correlation_id);
    expect(allIds).toContain(firstId);
    expect(allIds).toContain(success.correlation_id);

    // UI returns to success state — failure id no longer shown
    const status = await screen.findByTestId("emode-status");
    expect(status.getAttribute("data-state")).toBe("success");
    expect(screen.queryByText(new RegExp(`ID: ${firstId}`))).not.toBeInTheDocument();
  });

  it("status section transitions saving → success on slow first attempt with stable correlationId", async () => {
    // Simulate slow network on the FIRST attempt (timeout), then "connection
    // returns" and the second attempt succeeds. The status section must:
    //  - show 'saving' while the call is in-flight
    //  - end on 'success'
    //  - never expose more than one correlationId for the whole sequence
    //    (withRetries must reuse the same id end-to-end)
    let attempt = 0;
    let resolveSecond: ((v: any) => void) | null = null;
    updateSpy.mockImplementation(() => {
      attempt++;
      if (attempt === 1) {
        // First attempt "hangs" → timeout error (slow network)
        return Promise.reject(timeoutError());
      }
      // Second attempt waits until we manually let it resolve, so we can
      // observe the 'saving' state on the status section.
      return new Promise((resolve) => {
        resolveSecond = resolve;
      });
    });

    const stateRef = { current: null as any };
    render(<HostedStatus stateRef={stateRef} />);
    await waitFor(() => expect(stateRef.current).not.toBeNull());

    // Kick off the change WITHOUT awaiting (the second attempt is pending
    // on `resolveSecond`, so awaiting here would block forever and React's
    // `act` would never settle).
    let setModePromise!: Promise<void>;
    setModePromise = stateRef.current.setMode("pro");
    // Swallow rejection just in case — we don't expect one in this test
    setModePromise.catch(() => {});

    // While the second attempt is pending, status must be 'saving'
    await waitFor(() => {
      const s = screen.getByTestId("emode-status");
      expect(s.getAttribute("data-state")).toBe("saving");
    });
    expect(screen.getByText(/Salvando seu modo/i)).toBeInTheDocument();

    // "Connection comes back" → let the retried attempt resolve successfully
    await act(async () => {
      resolveSecond?.({ error: null });
      await setModePromise;
    });

    // Status section now shows success
    await waitFor(() => {
      const s = screen.getByTestId("emode-status");
      expect(s.getAttribute("data-state")).toBe("success");
    });
    expect(screen.getByText(/Modo ativo/i)).toBeInTheDocument();
    expect(screen.getByText(/Profissional/)).toBeInTheDocument();

    // Stable correlationId end-to-end:
    //  - exactly ONE success row
    //  - NO failed row (transient timeout was absorbed by withRetries)
    //  - the success correlation_id is the only one observed
    const successRows = auditInsertSpy.mock.calls
      .map((c: any) => c[0])
      .filter((c: any) => c.outcome === "success");
    expect(successRows).toHaveLength(1);
    expect(successRows[0].correlation_id).toMatch(/^emc-/);
    expect(lastInsertWithOutcome("failed")).toBeUndefined();

    const allIds = new Set(
      auditInsertSpy.mock.calls.map((c: any) => c[0].correlation_id)
    );
    expect(allIds.size).toBe(1);
    expect(allIds.has(successRows[0].correlation_id)).toBe(true);

    // No transient error leaked into the UI
    expect(screen.queryByText(/Tempo excedido/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tentar novamente/)).not.toBeInTheDocument();
    expect(attempt).toBeGreaterThanOrEqual(2);
  });

  it("user-facing text is the FINAL error, not the transient 'Tempo excedido'", async () => {
    // 1 transient timeout, then a permanent DB error → user must see the DB
    // error, not the intermediate timeout message.
    let n = 0;
    updateSpy.mockImplementation(() => {
      n++;
      if (n === 1) return Promise.reject(timeoutError());
      return Promise.resolve({
        error: { message: "duplicate key violates unique constraint" },
      });
    });

    const stateRef = { current: null as any };
    render(<HostedStatus stateRef={stateRef} />);
    await waitFor(() => expect(stateRef.current).not.toBeNull());

    await act(async () => {
      try {
        await stateRef.current.setMode("advanced");
      } catch {
        /* expected */
      }
    });

    await waitFor(() => expect(stateRef.current.failedMode).toBe("advanced"));

    const finalErr = stateRef.current.lastError;
    expect(finalErr?.message).toMatch(/duplicate key/);
    expect(finalErr?.message).not.toMatch(/Tempo excedido/);

    expect(await screen.findByText(/duplicate key/)).toBeInTheDocument();
    expect(screen.queryByText(/Tempo excedido/)).not.toBeInTheDocument();
  });
});
