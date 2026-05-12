import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mocks ───────────────────────────────────────────────────
vi.mock("@v1/lib/auth", () => ({ 
  useAuth: () => ({ 
    user: { id: "nutri-1" },
    isNutritionist: true,
    subscription: { subscribed: true }
  }) 
}));

vi.mock("@v1/lib/tenantContext", () => ({ useTenant: () => ({ tenantId: "t1" }) }));
vi.mock("@v1/lib/tenantQueryHelpers", () => ({ withTenantFilter: (q: any) => q }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));
vi.mock("@v1/components/layout/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));

vi.mock("@v1/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { full_name: "Paciente Teste", user_id: "pat-1" } }),
      then: vi.fn((cb) => {
        if (table === "nutritionist_patients") return Promise.resolve(cb({ data: [{ patient_id: "pat-1" }] }));
        if (table === "meal_plans") return Promise.resolve(cb({ data: [{ id: "p1", title: "Plano 1" }] }));
        if (table === "profiles") return Promise.resolve(cb({ data: [{ full_name: "Paciente Teste" }] }));
        if (table === "protocols") return Promise.resolve(cb({ data: [{ id: "pr1", title: "Protocolo 1" }] }));
        return Promise.resolve(cb({ data: [] }));
      }),
    })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis(), unsubscribe: vi.fn().mockReturnThis() })),
    removeChannel: vi.fn().mockResolvedValue(null)
  }
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

import Patients from "../Patients";
import MealPlans from "../MealPlans";
import Protocols from "../Protocols";

describe("Professional Flow", () => {
  const renderWithProviders = (ui: any) => render(
    <QueryClientProvider client={queryClient}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>
  );

  it("lists patients", async () => {
    renderWithProviders(<Patients />);
    await waitFor(() => expect(screen.getByText(/Paciente Teste/)).toBeDefined());
  });

  it("opens meal plan dialog", async () => {
    renderWithProviders(<MealPlans />);
    fireEvent.click(await screen.findByText(/Novo Plano/));
    await waitFor(() => expect(screen.getByText(/Criar Plano Alimentar/)).toBeDefined());
  });

  it("lists protocols", async () => {
    renderWithProviders(<Protocols />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /Protocolos/i })).toBeDefined());
  });
});
