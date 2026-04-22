import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import SmartAlertsBanner from "../SmartAlertsBanner";
import { MealItemCard } from "../MealPlanDailyView";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks ───────────────────────────────────────────────────────────

// Mock clinicalConstitution to allow changing constants in tests
vi.mock("@/lib/clinicalConstitution", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    CALORIC_DEFICIT_LIMITS: {
      ...actual.CALORIC_DEFICIT_LIMITS,
      MIN_CALORIES_FEMALE: 1200, // Default
    }
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ 
    user: { id: "patient-123" },
    profile: { id: "patient-123", full_name: "Test Patient" }
  }),
}));

import { supabase } from "@/integrations/supabase/client";
import * as clinicalConst from "@/lib/clinicalConstitution";

describe("Dynamic Clinical Bounds Configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates SmartAlertsBanner message when MIN_CALORIES_FEMALE is changed", async () => {
    // Change the threshold to 1000 temporarily
    // Note: In Vitest with ES modules, we might need to cast to any if it's readonly
    (clinicalConst.CALORIC_DEFICIT_LIMITS as any).MIN_CALORIES_FEMALE = 1000;

    const mockPatientId = "patient-123";
    
    (supabase.from as any).mockImplementation((table: string) => {
      const query: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
      };

      if (table === "patient_anamnesis") {
        query.limit.mockResolvedValue({
          data: [{ status: "completed", answers: { sex: "female" } }],
          error: null,
        });
      } else if (table === "meal_plans") {
        query.maybeSingle.mockResolvedValue({
          data: { id: "plan-1" },
          error: null,
        });
      } else if (table === "meal_plan_items") {
        query.limit.mockResolvedValue({
          data: [
            // Clamped at the new 1000 threshold
            { calories_target: 1000, protein_target: 80, carbs_target: 100, fat_target: 30 },
          ],
          error: null,
        });
      } else {
        query.limit.mockResolvedValue({ data: [], error: null });
        query.maybeSingle.mockResolvedValue({ data: null, error: null });
      }
      return query;
    });

    render(
      <MemoryRouter>
        <SmartAlertsBanner patientId={mockPatientId} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/garantir o limite de segurança \(1000 kcal\/dia\)/)).toBeInTheDocument();
    });

    // Reset back
    (clinicalConst.CALORIC_DEFICIT_LIMITS as any).MIN_CALORIES_FEMALE = 1200;
  });

  it("updates MealItemCard tooltip when MIN_CALORIES_FEMALE is changed", async () => {
    (clinicalConst.CALORIC_DEFICIT_LIMITS as any).MIN_CALORIES_FEMALE = 1400;

    const mockItem = {
      id: "item-1",
      title: "Clamped Meal",
      description: "...",
      meal_type: "lunch" as const,
      day_of_week: 1,
      calories_target: 1400, // Now clamped at 1400
      protein_target: 100,
      carbs_target: 100,
      fat_target: 44,
    };

    render(
      <MemoryRouter>
        <TooltipProvider>
          <MealItemCard 
            item={mockItem}
            status={null}
            completedAt={null}
            isJustDone={false}
            focusMode={false}
            onSetAdherence={() => {}}
            onOpenDetail={() => {}}
          />
        </TooltipProvider>
      </MemoryRouter>
    );

    const trigger = screen.getByLabelText(/Aviso de segurança: Calorias ajustadas para 1400 kcal/);
    expect(trigger).toBeInTheDocument();
    
    // Reset back
    (clinicalConst.CALORIC_DEFICIT_LIMITS as any).MIN_CALORIES_FEMALE = 1200;
  });
});
