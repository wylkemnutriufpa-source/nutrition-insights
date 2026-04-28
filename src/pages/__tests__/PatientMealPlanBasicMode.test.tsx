import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PatientMealPlan from "../PatientMealPlan";
import { useAuth } from "@/lib/auth";
import { useExperienceUI } from "@/hooks/useExperienceUI";
import { supabase } from "@/integrations/supabase/client";
import { BrowserRouter } from "react-router-dom";

// Mocking hooks
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useExperienceUI", () => ({
  useExperienceUI: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          limit: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      channel: vi.fn(() => ({
        on: vi.fn(() => ({
          subscribe: vi.fn(),
        })),
      })),
      removeChannel: vi.fn(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
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
      <BrowserRouter>
        <PatientMealPlan />
      </BrowserRouter>
    );

    // Should show "Sua dieta de hoje"
    expect(await screen.findByText(/Sua dieta de hoje/i)).toBeInTheDocument();
    
    // The DateNavigator or simple Badge should show "Hoje"
    expect(screen.getByText("Hoje")).toBeInTheDocument();
  });

  it("should open 'Ver outros dias' modal when clicked", async () => {
    render(
      <BrowserRouter>
        <PatientMealPlan />
      </BrowserRouter>
    );

    const openModalBtn = await screen.findByText(/Ver outros dias/i);
    fireEvent.click(openModalBtn);

    // Should show "Selecionar dia" (Dialog Title)
    expect(await screen.findByText("Selecionar dia")).toBeInTheDocument();
  });

  it("should show empty state if no meals for the day", async () => {
    // Mock RPC returning no items for the day
    (supabase.rpc as any).mockResolvedValue({
      data: {
        id: "plan-id",
        title: "Plano Teste",
        start_date: new Date().toISOString(),
        items: [],
      },
      error: null,
    });

    render(
      <BrowserRouter>
        <PatientMealPlan />
      </BrowserRouter>
    );

    // Should show the empty state message
    expect(await screen.findByText(/Nada planejado para este dia/i)).toBeInTheDocument();
    expect(screen.getByText(/Ver hoje/i)).toBeInTheDocument();
  });
});
