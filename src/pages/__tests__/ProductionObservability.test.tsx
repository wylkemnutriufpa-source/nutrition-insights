import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mocks ───────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ 
  useAuth: vi.fn(() => ({ 
    user: { id: "user-orphan-1" },
    profile: { is_orphan: true },
    loading: false,
    signOut: vi.fn()
  })) 
}));

vi.mock("@/lib/tenantContext", () => ({
  useTenant: vi.fn(() => ({ tenantId: "tenant-1", isLoading: false }))
}));

vi.mock("@/hooks/useAppState", () => ({
  AppStateProvider: ({ children }: any) => <>{children}</>,
  useAppState: vi.fn(() => ({ 
    isReady: true,
    isDegraded: false,
    isLoading: false,
    isOrphan: true 
  }))
}));

vi.mock("@/lib/auditLog", () => ({
  logAudit: vi.fn(),
  getSessionCorrelationId: vi.fn(() => "fj_sess_test123")
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

import { HardFailLinkage } from "@/components/common/HardFailLinkage";

describe("Production Observability - Hard Fail Linkage", () => {
  const renderWithProviders = (ui: any) => render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );

  it("exhibits the correct error message on linkage failure", async () => {
    renderWithProviders(<HardFailLinkage />);
    
    expect(screen.getByText("Erro ao vincular sua conta ao profissional")).toBeDefined();
    expect(screen.getAllByText(/ID do Erro/i).length).toBeGreaterThan(0);
    expect(screen.getByText("fj_sess_test123")).toBeDefined();
  });

  it("shows the support button and correlation ID", async () => {
    renderWithProviders(<HardFailLinkage />);
    
    const supportBtn = screen.getByRole("button", { name: /suporte/i });
    expect(supportBtn).toBeDefined();
  });

  it("logs the linkage failure for audit", async () => {
    const { logAudit } = await import("@/lib/auditLog");
    renderWithProviders(<HardFailLinkage />);
    
    expect(logAudit).toHaveBeenCalledWith(
      "LINKAGE_FAIL", 
      "auth", 
      "user-orphan-1", 
      expect.objectContaining({
        isOrphan: true
      }),
      "error",
      "fj_sess_test123"
    );
  });
});
