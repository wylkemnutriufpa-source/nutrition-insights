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
  logAudit: vi.fn()
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

import { OrphanUserBlock } from "@/components/common/OrphanUserBlock";

describe("Production Observability - Hard Fail Linkage", () => {
  const renderWithProviders = (ui: any) => render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );

  it("exhibits the correct error message on linkage failure", async () => {
    renderWithProviders(<OrphanUserBlock />);
    
    expect(screen.getByText("Erro ao vincular sua conta ao profissional")).toBeDefined();
    expect(screen.getByText(/ID do erro: err_/)).toBeDefined();
  });

  it("shows the support button and correlation ID", async () => {
    renderWithProviders(<OrphanUserBlock />);
    
    const supportBtn = screen.getByRole("button", { name: /suporte/i });
    expect(supportBtn).toBeDefined();
    
    const copyBtn = screen.getByRole("button", { name: "" }); // icon button
    expect(copyBtn).toBeDefined();
  });

  it("logs the linkage failure for audit", async () => {
    const { logAudit } = await import("@/lib/auditLog");
    renderWithProviders(<OrphanUserBlock />);
    
    expect(logAudit).toHaveBeenCalledWith(
      "hard_fail_linkage", 
      "auth", 
      "user-orphan-1", 
      expect.objectContaining({
        correlationId: expect.stringMatching(/^err_/),
        status: "blocked"
      })
    );
  });
});
