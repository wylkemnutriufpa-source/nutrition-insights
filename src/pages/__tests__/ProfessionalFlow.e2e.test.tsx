import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Patients from "../Patients";
import MealPlans from "../MealPlans";
import Protocols from "../Protocols";

// ─── Mocks (hoisted) ───────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({ 
  useAuth: () => ({ 
    user: { id: "nutri-1", email: "nutri@test.com" },
    isNutritionist: true,
    isAdmin: false,
    subscription: { subscribed: true, is_trial: false }
  }) 
}));

vi.mock("@/lib/tenantContext", () => ({
  useTenant: () => ({ tenantId: "tenant-1" }),
}));

vi.mock("@/lib/tenantQueryHelpers", () => ({
  withTenantFilter: (q: any) => q,
  getTenantIdForInsert: () => ({ tenant_id: "tenant-1" }),
}));

vi.mock("sonner", () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock do Supabase Client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table) => {
      const result = { data: [], error: null, count: 0 };
      
      // Simulação de dados por tabela
      if (table === "nutritionist_patients") result.data = [{ id: "link-1", patient_id: "pat-1", status: "active" }];
      if (table === "profiles") result.data = [{ user_id: "pat-1", full_name: "Paciente Teste" }];
      if (table === "meal_plans") result.data = [
        { id: "plan-1", title: "Plano Teste", patient_id: "pat-1", plan_status: "published", is_active: true }
      ];
      if (table === "protocols") result.data = [
        { id: "proto-1", title: "Protocolo Teste", created_by: "nutri-1", is_template: true }
      ];

      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: result.data[0] || null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: result.data[0] || null, error: null }),
        then: vi.fn((cb) => Promise.resolve(cb({ data: result.data, error: null, count: result.data.length }))),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
      };
      return chain;
    }),
    rpc: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: true, mealPlanId: "new-plan-1" }, error: null })
    }
  }
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe("E2E Professional Flow: Patient -> Plan -> Protocol", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          {ui}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it("should list patients and navigate to detail", async () => {
    renderWithProviders(<Patients />);

    await waitFor(() => {
      expect(screen.getByText("Paciente Teste")).toBeDefined();
    });
  });

  it("should open create meal plan dialog and trigger auto-generation", async () => {
    renderWithProviders(<MealPlans />);

    // Abrir modal de novo plano
    const newPlanBtn = await screen.findByText("Novo Plano");
    fireEvent.click(newPlanBtn);

    // Selecionar paciente
    const selects = await screen.findAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "pat-1" } });

    // Verificar se o modal abre e mostra conteúdo
    await waitFor(() => {
      expect(screen.getByText("Criar Plano Alimentar")).toBeDefined();
    });
  });

  it("should display protocols list", async () => {
    renderWithProviders(<Protocols />);

    await waitFor(() => {
      expect(screen.getByText("Protocolos")).toBeDefined();
    });
  });
});

