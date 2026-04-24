/**
 * Tests for ExperienceModeStatusSection covering all visual states:
 * - saving (loading)
 * - success
 * - failed (with retry)
 * - blocked (with unlock_date in text)
 * - offline (queued)
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

function renderWith(value: ExperienceModeContextValue) {
  return render(
    <ExperienceModeContext.Provider value={value}>
      <ExperienceModeStatusSection />
    </ExperienceModeContext.Provider>
  );
}

describe("ExperienceModeStatusSection", () => {
  it("renders SAVING state when isLoading=true", () => {
    renderWith(makeCtx({ isLoading: true }));
    const root = screen.getByTestId("emode-status");
    expect(root.getAttribute("data-state")).toBe("saving");
    expect(screen.getByText(/Salvando seu modo/i)).toBeInTheDocument();
  });

  it("renders SUCCESS state with current mode label", () => {
    renderWith(makeCtx({ mode: "pro", isBasic: false, isPro: true }));
    const root = screen.getByTestId("emode-status");
    expect(root.getAttribute("data-state")).toBe("success");
    expect(screen.getByText(/Modo ativo/i)).toBeInTheDocument();
    expect(screen.getByText(/Profissional/)).toBeInTheDocument();
  });

  it("renders BLOCKED state with reason, condition and unlock date", () => {
    const unlock = new Date("2030-12-31T00:00:00Z").toISOString();
    const err: any = Object.assign(new Error("Modo bloqueado por segurança"), {
      code: "MODE_LOCKED",
      correlationId: "emc-test-1",
      unlock_date: unlock,
      blockTitle: "Modo Profissional bloqueado",
      blockDescription:
        "Sua conta está restrita. Complete a atualização clínica obrigatória para liberar. Liberação prevista para 31/12/2030.",
    });
    renderWith(
      makeCtx({
        failedMode: "pro",
        lastError: err,
      })
    );
    const root = screen.getByTestId("emode-status");
    expect(root.getAttribute("data-state")).toBe("blocked");
    expect(screen.getByText("Modo Profissional bloqueado")).toBeInTheDocument();
    // Reason + condition + unlock date are all in the description
    expect(screen.getByText(/Complete a atualização clínica obrigatória/i)).toBeInTheDocument();
    expect(screen.getByText(/31\/12\/2030/)).toBeInTheDocument();
    expect(screen.getByText(/emc-test-1/)).toBeInTheDocument();
  });

  it("renders FAILED state with retry button", () => {
    const retry = vi.fn();
    const err: any = Object.assign(new Error("Network error"), {
      code: "DB_ERROR",
      correlationId: "emc-test-fail",
    });
    renderWith(
      makeCtx({
        failedMode: "advanced",
        lastError: err,
        retryLastMode: retry,
      })
    );
    const root = screen.getByTestId("emode-status");
    expect(root.getAttribute("data-state")).toBe("failed");
    expect(screen.getByText(/Falha ao atualizar o modo/i)).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /Tentar novamente/i });
    expect(button).toBeInTheDocument();
    button.click();
    expect(retry).toHaveBeenCalled();
  });

  it("renders OFFLINE state when error code is OFFLINE", () => {
    const err: any = Object.assign(new Error("Sem conexão"), {
      code: "OFFLINE",
      correlationId: "emc-offline",
    });
    renderWith(
      makeCtx({
        failedMode: "pro",
        lastError: err,
        pendingQueueSize: 2,
      })
    );
    const root = screen.getByTestId("emode-status");
    expect(root.getAttribute("data-state")).toBe("offline");
    expect(screen.getByText(/Sem conexão/)).toBeInTheDocument();
    expect(screen.getByText(/2 tentativa\(s\) pendente\(s\)/)).toBeInTheDocument();
  });
});
