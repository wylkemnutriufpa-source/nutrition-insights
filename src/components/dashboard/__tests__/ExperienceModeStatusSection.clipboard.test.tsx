/**
 * Tests for the CorrelationIdBadge inside ExperienceModeStatusSection.
 *
 * Verifies that copying the correlationId:
 *  - Always shows a toast feedback (success on copy, error on permission denied)
 *  - Always preserves the original correlationId text on screen, even when
 *    the clipboard permission is rejected (i.e. the badge does not get cleared
 *    or reformatted by the failure path).
 *  - Triggers the visible tooltip ("Copiado!") only on success.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ExperienceModeStatusSection from "../ExperienceModeStatusSection";
import { ExperienceModeContext, type ExperienceModeContextValue } from "@/hooks/useExperienceMode";

// Mock sonner so we can assert the toast was called regardless of UI rendering
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: any[]) => toastSuccess(...args),
    error: (...args: any[]) => toastError(...args),
  },
}));

const CID = "emc-test-1234-abcd";

function makeFailedCtx(): ExperienceModeContextValue {
  return {
    mode: "basic",
    setMode: async () => {},
    isRouteAllowed: () => true,
    isBasic: true,
    isPro: false,
    isAdvanced: false,
    isLoading: false,
    failedMode: "pro",
    lastError: {
      code: "UNKNOWN",
      message: "Falha simulada",
      correlationId: CID,
    } as any,
    isOffline: false,
    pendingQueueSize: 0,
    queueStats: { size: 0, isFull: false, hasExpired: false, oldestQueuedAt: null },
    retryLastMode: vi.fn(),
    minMode: () => true,
    role: "patient",
  };
}

function renderBadge(ctx = makeFailedCtx()) {
  return render(
    <ExperienceModeContext.Provider value={ctx}>
      <ExperienceModeStatusSection />
    </ExperienceModeContext.Provider>
  );
}

describe("CorrelationIdBadge — clipboard behaviour", () => {
  beforeEach(() => {
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  afterEach(() => {
    // restore clipboard on navigator
    try {
      // @ts-expect-error: cleanup
      delete (navigator as any).clipboard;
    } catch {
      /* ignore */
    }
  });

  it("shows the correlationId text on screen", () => {
    renderBadge();
    const badge = screen.getByTestId("emode-correlation-id");
    expect(badge).toHaveTextContent(`ID: ${CID}`);
  });

  it("calls toast.success and shows 'Copiado!' tooltip when clipboard write succeeds", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    renderBadge();
    const badge = screen.getByTestId("emode-correlation-id");
    fireEvent.click(badge);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(CID));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1));
    expect(toastSuccess.mock.calls[0][0]).toBe("ID copiado");
    expect(toastSuccess.mock.calls[0][1]).toMatchObject({ description: CID });

    // Tooltip should switch to "Copiado!" on success
    await waitFor(() => {
      const tooltips = screen.getAllByTestId("emode-correlation-tooltip");
      expect(tooltips.some((t) => /Copiado/i.test(t.textContent || ""))).toBe(true);
    });

    // Original correlationId text MUST remain intact after copy
    expect(screen.getByTestId("emode-correlation-id")).toHaveTextContent(`ID: ${CID}`);
  });

  it("calls toast.error and preserves correlationId text when clipboard permission is denied", async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    renderBadge();
    const badge = screen.getByTestId("emode-correlation-id");
    fireEvent.click(badge);

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastError.mock.calls[0][0]).toMatch(/Não foi possível copiar/i);

    // No success toast must have been triggered
    expect(toastSuccess).not.toHaveBeenCalled();

    // The displayed correlationId text MUST remain exactly the same
    const after = screen.getByTestId("emode-correlation-id");
    expect(after).toHaveTextContent(`ID: ${CID}`);

    // Tooltip on failure must NOT show "Copiado!" — keeps the default copy hint
    const tooltips = screen.queryAllByTestId("emode-correlation-tooltip");
    for (const t of tooltips) {
      expect(t.textContent || "").not.toMatch(/Copiado!/);
    }
  });

  it("calls toast.error when navigator.clipboard is unavailable and keeps the badge text intact", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });

    renderBadge();
    const badge = screen.getByTestId("emode-correlation-id");
    fireEvent.click(badge);

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(screen.getByTestId("emode-correlation-id")).toHaveTextContent(`ID: ${CID}`);
  });
});
