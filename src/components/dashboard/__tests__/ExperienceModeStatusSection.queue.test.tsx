/**
 * Tests for ExperienceModeStatusSection — queue full / expired hints.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ExperienceModeStatusSection from "../ExperienceModeStatusSection";
import { ExperienceModeContext, type ExperienceModeContextValue } from "@/hooks/useExperienceMode";

function makeCtx(over: Partial<ExperienceModeContextValue>): ExperienceModeContextValue {
  return {
    mode: "basic",
    setMode: async () => {},
    isRouteAllowed: () => true,
    isBasic: true,
    isPro: false,
    isAdvanced: false,
    isLoading: false,
    failedMode: null,
    lastError: null,
    isOffline: false,
    pendingQueueSize: 0,
    queueStats: { size: 0, isFull: false, hasExpired: false, oldestQueuedAt: null },
    retryLastMode: vi.fn(),
    minMode: () => true,
    role: "patient",
    ...over,
  };
}

describe("ExperienceModeStatusSection — queue limits", () => {
  it("shows 'Fila cheia' when queueStats.isFull is true", () => {
    const err: any = Object.assign(new Error("offline"), {
      code: "OFFLINE",
      correlationId: "emc-q1",
    });
    render(
      <ExperienceModeContext.Provider
        value={makeCtx({
          failedMode: "pro",
          lastError: err,
          pendingQueueSize: 20,
          queueStats: { size: 20, isFull: true, hasExpired: false, oldestQueuedAt: Date.now() },
        })}
      >
        <ExperienceModeStatusSection />
      </ExperienceModeContext.Provider>
    );
    expect(screen.getByTestId("emode-queue-full")).toBeInTheDocument();
    expect(screen.getByText(/Fila cheia/i)).toBeInTheDocument();
  });

  it("shows 'expiraram' when queueStats.hasExpired is true", () => {
    const err: any = Object.assign(new Error("offline"), {
      code: "OFFLINE",
      correlationId: "emc-q2",
    });
    render(
      <ExperienceModeContext.Provider
        value={makeCtx({
          failedMode: "advanced",
          lastError: err,
          pendingQueueSize: 1,
          queueStats: { size: 1, isFull: false, hasExpired: true, oldestQueuedAt: 0 },
        })}
      >
        <ExperienceModeStatusSection />
      </ExperienceModeContext.Provider>
    );
    expect(screen.getByTestId("emode-queue-expired")).toBeInTheDocument();
  });
});
