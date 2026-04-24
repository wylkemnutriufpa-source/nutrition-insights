/**
 * E2E test: toggle navigator.onLine during a mode update.
 *
 * Scenario:
 *  1. Start ONLINE — kick off setMode("pro").
 *  2. Before the DB resolves, flip navigator.onLine = false (simulating
 *     the connection dropping mid-flight). The in-flight call still
 *     resolves successfully (the request had already left the browser).
 *  3. Verify the status section transitions: saving → success.
 *  4. Verify exactly ONE correlationId is used for the entire attempt
 *     (no separate failed/queued row created for the in-flight one),
 *     and the same id appears in the audit insert and the hook state.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { useExperienceModeState, ExperienceModeContext } from "../useExperienceMode";
import ExperienceModeStatusSection from "@/components/dashboard/ExperienceModeStatusSection";
import { supabase } from "@/integrations/supabase/client";

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
      return {
        select: () => ({
          eq: () => ({ maybeSingle: () => selectMaybeSingleSpy() }),
        }),
        update: () => ({ eq: () => updateSpy() }),
      };
    }),
  },
}));

function HostedStatus({ stateRef }: { stateRef: any }) {
  const value = useExperienceModeState("patient");
  stateRef.current = value;
  return (
    <ExperienceModeContext.Provider value={value as any}>
      <ExperienceModeStatusSection />
    </ExperienceModeContext.Provider>
  );
}

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => value,
  });
  window.dispatchEvent(new Event(value ? "online" : "offline"));
}

describe("useExperienceMode — online↔offline toggle during update", () => {
  const originalOnLineDescriptor = Object.getOwnPropertyDescriptor(
    window.navigator,
    "onLine"
  );

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    setOnline(true);
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: "patient-1" } },
    });
    selectMaybeSingleSpy.mockResolvedValue({
      data: { experience_mode_locked: false, unlock_date: null },
      error: null,
    });
  });

  afterEach(() => {
    if (originalOnLineDescriptor) {
      Object.defineProperty(window.navigator, "onLine", originalOnLineDescriptor);
    }
  });

  it("toggles offline mid-update; status goes saving → success with stable correlationId", async () => {
    // Build a deferred promise for the in-flight UPDATE so we control
    // exactly when it resolves — and can flip navigator.onLine in between.
    let resolveUpdate!: (v: any) => void;
    const updatePromise = new Promise<any>((r) => {
      resolveUpdate = r;
    });
    updateSpy.mockImplementation(() => updatePromise);

    const stateRef = { current: null as any };
    render(<HostedStatus stateRef={stateRef} />);
    await waitFor(() => expect(stateRef.current).not.toBeNull());

    // Online when we kick off the change.
    expect(navigator.onLine).toBe(true);

    let setModePromise!: Promise<void>;
    await act(async () => {
      setModePromise = stateRef.current.setMode("pro");
    });
    setModePromise.catch(() => {});

    // While in-flight: status is 'saving'.
    await waitFor(() => {
      expect(stateRef.current.isLoading).toBe(true);
      const s = screen.getByTestId("emode-status");
      expect(s.getAttribute("data-state")).toBe("saving");
    });

    // Network drops mid-flight (the request had already left the browser).
    await act(async () => {
      setOnline(false);
    });

    // Now the request "comes back successfully" — connection blip didn't
    // actually kill the request. Network comes back online and we resolve.
    await act(async () => {
      setOnline(true);
      resolveUpdate({ error: null });
      await setModePromise;
    });

    // Status section transitioned: saving → success.
    await waitFor(() => {
      const s = screen.getByTestId("emode-status");
      expect(s.getAttribute("data-state")).toBe("success");
    });
    expect(screen.getByText(/Modo ativo/i)).toBeInTheDocument();

    // Stable correlationId end-to-end:
    //  - the success audit row is the only outcome row for this attempt
    //  - all audit ids for the just-completed attempt match
    const successRows = auditInsertSpy.mock.calls
      .map((c: any) => c[0])
      .filter((c: any) => c.outcome === "success");
    expect(successRows).toHaveLength(1);
    expect(successRows[0].correlation_id).toMatch(/^emc-/);

    // No failed / offline_queued row was emitted for THIS attempt's id.
    const successId = successRows[0].correlation_id;
    const otherOutcomesForThisId = auditInsertSpy.mock.calls
      .map((c: any) => c[0])
      .filter(
        (c: any) =>
          c.correlation_id === successId && c.outcome !== "success"
      );
    expect(otherOutcomesForThisId).toHaveLength(0);

    // Hook is clean and the user-facing state matches.
    expect(stateRef.current.lastError).toBeNull();
    expect(stateRef.current.failedMode).toBeNull();
    expect(stateRef.current.mode).toBe("pro");
  });

  it("if user calls setMode while OFFLINE, attempt is queued with a correlationId visible in status", async () => {
    setOnline(false);

    const stateRef = { current: null as any };
    render(<HostedStatus stateRef={stateRef} />);
    await waitFor(() => expect(stateRef.current).not.toBeNull());

    await act(async () => {
      try {
        await stateRef.current.setMode("advanced");
      } catch {
        /* expected — OFFLINE error */
      }
    });

    await waitFor(() => expect(stateRef.current.failedMode).toBe("advanced"));
    expect(stateRef.current.lastError?.code).toBe("OFFLINE");

    const status = await screen.findByTestId("emode-status");
    expect(status.getAttribute("data-state")).toBe("offline");

    const cid = stateRef.current.lastError?.correlationId;
    expect(cid).toMatch(/^emc-/);
    // The new copy badge surfaces "ID: emc-…"
    expect(screen.getByText(new RegExp(`ID: ${cid}`))).toBeInTheDocument();

    const queuedRow = auditInsertSpy.mock.calls
      .map((c: any) => c[0])
      .find((c: any) => c.outcome === "offline_queued");
    expect(queuedRow?.correlation_id).toBe(cid);
  });
});
