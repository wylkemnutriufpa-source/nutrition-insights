import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import SmartAlertsBanner from "../SmartAlertsBanner";
import { MealItemCard } from "../MealPlanDailyView";
import { TooltipProvider } from "@v1/components/ui/tooltip";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks ───────────────────────────────────────────────────────────
vi.mock("@v1/integrations/supabase/client", () => ({
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

vi.mock("@v1/lib/auth", () => ({
  useAuth: () => ({ 
    user: { id: "patient-123" },
    profile: { id: "patient-123", full_name: "Test Patient" }
  }),
}));

import { supabase } from "@v1/integrations/supabase/client";

describe("Meal Plan UI Warnings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SmartAlertsBanner", () => {
    it("displays clamping warning with exact threshold for female patient", async () => {
      const mockPatientId = "patient-123";
      
      // Mock Supabase responses
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
              { calories_target: 1200, protein_target: 100, carbs_target: 100, fat_target: 44 },
            ],
            error: null,
          });
        } else if (table === "checklist_tasks") {
           // Mock checklist as completed to avoid that alert
           query.eq.mockReturnThis();
           query.limit = undefined;
           const result = { data: [{ id: "t1", completed: true }], error: null };
           return { ...query, then: (cb: any) => Promise.resolve(cb(result)) };
        } else if (table === "patient_protocols") {
           // Avoid active protocols alert
           const result = { data: [], error: null };
           return { ...query, then: (cb: any) => Promise.resolve(cb(result)) };
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
        const alert = screen.getByRole("alert");
        expect(alert).toBeInTheDocument();
        expect(screen.queryByText("Plano Alimentar Ajustado")).toBeInTheDocument();
        expect(screen.getByText(/garantir o limite de segurança \(1200 kcal\/dia\)/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it("displays clamping warning with exact threshold for male patient", async () => {
      const mockPatientId = "patient-456";
      
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
            data: [{ status: "completed", answers: { sex: "male" } }],
            error: null,
          });
        } else if (table === "meal_plans") {
          query.maybeSingle.mockResolvedValue({
            data: { id: "plan-2" },
            error: null,
          });
        } else if (table === "meal_plan_items") {
          query.limit.mockResolvedValue({
            data: [
              { calories_target: 1500, protein_target: 120, carbs_target: 150, fat_target: 50 },
            ],
            error: null,
          });
        } else if (table === "checklist_tasks") {
           query.eq.mockReturnThis();
           const result = { data: [{ id: "t1", completed: true }], error: null };
           return { ...query, then: (cb: any) => Promise.resolve(cb(result)) };
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
        expect(screen.getByText("Plano Alimentar Ajustado")).toBeInTheDocument();
        expect(screen.getByText(/garantir o limite de segurança \(1500 kcal\/dia\)/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe("MealItemCard Tooltips", () => {
    it("shows specific threshold in tooltip when clamped", async () => {
      const mockItem = {
        id: "item-1",
        title: "Test Meal",
        description: "Test Description",
        meal_type: "lunch" as const,
        day_of_week: 1,
        calories_target: 1200,
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

      expect(screen.getByText("1200 kcal")).toBeInTheDocument();
      
      const trigger = screen.getByLabelText(/Aviso de segurança: Calorias ajustadas para 1200 kcal/);
      expect(trigger).toBeInTheDocument();
      expect(trigger.tagName).toBe("BUTTON");
    });
    
    it("is keyboard navigable and accessible", async () => {
      const mockItem = {
        id: "item-1",
        title: "Test Meal",
        description: "Test Description",
        meal_type: "lunch" as const,
        day_of_week: 1,
        calories_target: 1200,
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

      const trigger = screen.getByLabelText(/Aviso de segurança: Calorias ajustadas para 1200 kcal/);
      trigger.focus();
      expect(document.activeElement).toBe(trigger);
    });
  });
});
