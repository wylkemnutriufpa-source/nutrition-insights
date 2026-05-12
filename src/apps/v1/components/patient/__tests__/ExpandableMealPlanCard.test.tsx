/**
 * Component tests for ExpandableMealPlanCard.
 *
 * Goal: ensure that `item.description` (the meal suggestion / ingredient list)
 * is rendered in all three view tabs: "Hoje", "Semanal" and "Completo".
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";

// ---------- Hoisted constants ----------
const { TODAY, TODAY_DOW, ITEMS } = vi.hoisted(() => {
  const TODAY = new Date().toISOString().split("T")[0];
  const TODAY_DOW = new Date(TODAY + "T12:00:00").getDay();
  const ITEMS = [
    {
      id: "item-lunch-today",
      title: "MarmitaCarneMagra",
      description: "Patinho moído 80g\nArroz integral 100g\nBrócolis 60g",
      meal_type: "lunch",
      day_of_week: TODAY_DOW,
      calories_target: 520,
      protein_target: 35,
      carbs_target: 50,
      fat_target: 15,
    },
    {
      id: "item-dinner-other",
      title: "MarmitaFrangoGrelhado",
      description: "Frango grelhado 120g\nBatata doce 100g\nSalada verde",
      meal_type: "dinner",
      day_of_week: (TODAY_DOW + 1) % 7,
      calories_target: 480,
      protein_target: 40,
      carbs_target: 45,
      fat_target: 12,
    },
  ];
  return { TODAY, TODAY_DOW, ITEMS };
});

// ---------- Mocks ----------
vi.mock("@v1/lib/auth", () => ({
  useAuth: () => ({ user: { id: "patient-test-id" } }),
}));

vi.mock("@v1/integrations/supabase/client", () => {
  const makeQB = (data: any) => {
    const result = { data, error: null };
    const b: any = {};
    b.select = () => b;
    b.eq = () => b;
    b.gte = () => b;
    b.lte = () => b;
    b.order = () => b;
    b.limit = () => b;
    b.maybeSingle = () => Promise.resolve(result);
    b.then = (resolve: any) => Promise.resolve(result).then(resolve);
    return b;
  };

  return {
    supabase: {
      from: (table: string) => {
        if (table === "meal_plans") {
          return makeQB({
            id: "plan-1",
            title: "PlanoWannubia",
            start_date: TODAY,
          });
        }
        if (table === "meal_plan_items") return makeQB(ITEMS);
        return makeQB([]);
      },
    },
  };
});

vi.mock("framer-motion", async () => {
  const passthrough = (props: any) => {
    const { children, ...rest } = props || {};
    const safe: any = {};
    const excluded = ["initial", "animate", "exit", "transition", "variants", "whileHover", "whileTap", "layout"];
    for (const k of Object.keys(rest)) {
      if (!excluded.includes(k)) safe[k] = rest[k];
    }
    return React.createElement("div", safe, children);
  };
  return {
    AnimatePresence: ({ children }: any) => children,
    motion: new Proxy({}, { get: () => passthrough }),
  };
});

// ---------- Import under test ----------
import ExpandableMealPlanCard from "@v1/components/patient/ExpandableMealPlanCard";

async function renderCard() {
  render(
    <MemoryRouter>
      <ExpandableMealPlanCard />
    </MemoryRouter>,
  );
  // Wait for loading to finish
  await waitFor(() => {
    expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
  }, { timeout: 5000 });

  // Expand the card
  const expandBtn = screen.getByRole("button", { name: /Meu Plano Alimentar/i });
  fireEvent.click(expandBtn);
}

describe("ExpandableMealPlanCard - description rendering", () => {
  it("renders item.description in the 'Hoje' (today) tab", async () => {
    await renderCard();
    expect(await screen.findByText(/MarmitaCarneMagra/i)).toBeInTheDocument();
    expect(screen.getByText(/Patinho moído 80g/i)).toBeInTheDocument();
  });

  it("renders item.description in the 'Semanal' (weekly) tab", async () => {
    await renderCard();
    
    const weeklyTab = screen.getByRole("tab", { name: /Semanal/i });
    fireEvent.click(weeklyTab);

    const dayShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const targetLabel = dayShort[(TODAY_DOW + 1) % 7];

    const pills = await screen.findAllByRole("button");
    const targetPill = pills.find(p => p.textContent?.includes(targetLabel));
    expect(targetPill).toBeDefined();
    fireEvent.click(targetPill!);

    expect(await screen.findByText(/MarmitaFrangoGrelhado/i)).toBeInTheDocument();
    expect(screen.getByText(/Frango grelhado 120g/i)).toBeInTheDocument();
  });

  it("renders item.description for ALL items in the 'Completo' (full) tab", async () => {
    await renderCard();

    const fullTab = screen.getByRole("tab", { name: /Completo/i });
    fireEvent.click(fullTab);

    expect(await screen.findByText(/MarmitaCarneMagra/i)).toBeInTheDocument();
    expect(screen.getByText(/MarmitaFrangoGrelhado/i)).toBeInTheDocument();
    expect(screen.getByText(/Frango grelhado 120g/i)).toBeInTheDocument();
  });
});
