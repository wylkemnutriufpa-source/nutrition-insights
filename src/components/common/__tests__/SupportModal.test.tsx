import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mocks ───────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ 
  useAuth: vi.fn(() => ({ 
    user: { id: "user-1", email: "test@example.com" },
    loading: false
  })) 
}));

vi.mock("@/lib/tenantContext", () => ({
  useTenant: vi.fn(() => ({ tenantId: "tenant-1", isLoading: false }))
}));

vi.mock("@/lib/auditLog", () => ({
  logAudit: vi.fn(),
  getSessionCorrelationId: vi.fn(() => "fj_sess_test123")
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

import { SupportModal } from "../SupportModal";

describe("SupportModal - Accessibility & Interaction", () => {
  const renderWithProviders = (ui: any) => render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );

  it("renders with correct ID and user info", async () => {
    renderWithProviders(<SupportModal isOpen={true} onClose={vi.fn()} />);
    
    expect(screen.getByText("fj_sess_test123")).toBeDefined();
    expect(screen.getByText("test@example.com")).toBeDefined();
  });

  it("shows feedback when ID is copied", async () => {
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    renderWithProviders(<SupportModal isOpen={true} onClose={vi.fn()} />);
    
    const copyBtn = screen.getByRole("button", { name: /COPIAR ID/i });
    fireEvent.click(copyBtn);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("fj_sess_test123");
    expect(screen.getByText(/COPIADO/i)).toBeDefined();
  });

  it("calls onClose when modal should close", async () => {
    const onClose = vi.fn();
    renderWithProviders(<SupportModal isOpen={true} onClose={onClose} />);
    
    // Close button (X) - we need to find it by its svg or aria-label if Radix provides one
    // Radix Dialog close usually has a primitive that we can target
    const closeBtn = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeBtn);
    
    expect(onClose).toHaveBeenCalled();
  });
});
