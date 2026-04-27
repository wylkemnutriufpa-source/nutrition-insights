import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MealItemCard } from "@/components/patient/MealPlanDailyView";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: "test-user" } }),
}));

vi.mock("@/hooks/useMealVisualItem", () => ({
  useMealVisualItem: () => ({ item: null }),
}));

vi.mock("@/hooks/useSignedStorageUrl", () => ({
  useSignedStorageUrl: () => ({ url: null }),
}));


const queryClient = new QueryClient();

const mockItem = {
  id: "test-id",
  title: "Galinhada FIT",
  description: "Arroz com frango e legumes",
  meal_type: "dinner" as const,
  day_of_week: 0,
  calories_target: 500,
  protein_target: 30,
  carbs_target: 40,
  fat_target: 10,
  is_primary: true,
  edit_metadata: { is_fixed: true }
};

describe("Marmita UI", () => {
  it("renders 'Prato Principal' badge for fixed meals", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MealItemCard 
            item={mockItem}
            status={null}
            completedAt={null}
            isJustDone={false}
            focusMode={false}
            onSetAdherence={() => {}}
            onOpenDetail={() => {}}
            onOpenSubstitution={() => {}}
          />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText(/Prato Principal/i)).toBeInTheDocument();
    expect(screen.queryByText(/marmita do dia/i)).not.toBeInTheDocument();
  });

  it("renders 'Substituição' prefix for non-primary items", () => {
    const subItem = { ...mockItem, is_primary: false, title: "Estrogonofe" };
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MealItemCard 
            item={subItem}
            status={null}
            completedAt={null}
            isJustDone={false}
            focusMode={false}
            onSetAdherence={() => {}}
            onOpenDetail={() => {}}
            onOpenSubstitution={() => {}}
          />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText(/Substituição: Estrogonofe/i)).toBeInTheDocument();
  });
});
