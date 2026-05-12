import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PatientMealPlan from "../PatientMealPlan";
import { useAuth } from "@/lib/auth";
import { useExperienceUI } from "@/hooks/useExperienceUI";
import { supabase } from "@/integrations/supabase/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});


// Mocking hooks
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useExperienceUI", () => ({
  useExperienceUI: vi.fn(),
}));

vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div>,
}));


vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => ({
        unsubscribe: vi.fn(),
      })),
    })),
    removeChannel: vi.fn(),
  },
}));


describe("PatientMealPlan - Basic Mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock user
    (useAuth as any).mockReturnValue({
      user: { id: "test-user-id" },
      roles: ["patient"],
      subscription: { subscribed: true, is_trial: false },
    });


    // Mock basic mode
    (useExperienceUI as any).mockReturnValue({
      isBasic: true,
      minMode: (mode: string) => mode === "basic",
    });

    // Mock successful RPC response
    (supabase.rpc as any).mockResolvedValue({
      data: {
        id: "plan-id",
        title: "Plano Teste",
        start_date: new Date().toISOString(),
        items: [
          {
            id: "meal-1",
            title: "Café da Manhã",
            meal_type: "breakfast",
            day_of_week: new Date().getDay(),
            calories_target: 300,
          }
        ],
      },
      error: null,
    });
  });

  it("should always start on today in basic mode", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <PatientMealPlan />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );



    // Should show "Sua dieta de hoje"
    expect(await screen.findByText(/Sua dieta de hoje/i)).toBeInTheDocument();
    
    // The DateNavigator or simple Badge should show "Hoje"
    expect(screen.getByText("Hoje")).toBeInTheDocument();
  });

  it("should open 'Ver outros dias' modal when clicked", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <PatientMealPlan />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );



    const openModalBtn = await screen.findByText(/Ver outros dias/i);
    fireEvent.click(openModalBtn);

    // Should show "Selecionar dia" (Dialog Title)
    expect(await screen.findByText("Selecionar dia")).toBeInTheDocument();
  });

  it("should show empty state if no meals for the day", async () => {
    // Mock RPC returning no items for the day, but having other items in the plan
    (supabase.rpc as any).mockResolvedValue({
      data: {
        id: "plan-id",
        title: "Plano Teste",
        start_date: new Date().toISOString(),
        items: [], // No items for today
      },
      error: null,
    });

    // Mocking allItems to have something so we don't hit the top-level empty state
    // We need to mock the from('meal_plan_items').select('*') call
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "meal_plan_items") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (cb: any) => cb({ data: [{ id: "other-meal", day_of_week: 1 }], error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        order: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
      };
    });


    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <PatientMealPlan />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );



    // Should show the empty state message
    expect(await screen.findByText(/Nada planejado para este dia/i)).toBeInTheDocument();
    expect(screen.getByText(/Ver hoje/i)).toBeInTheDocument();
  });
});
