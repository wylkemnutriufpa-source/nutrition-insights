/**
 * Component tests for ExpandableMealPlanCard.
 *
 * Goal: ensure that `item.description` (the meal suggestion / ingredient list)
 * is rendered in all three view tabs: "Hoje", "Semanal" and "Completo".
 *
 * This protects against regressions where the description was hidden or
 * truncated, which was the root cause of patient Wannubia not seeing her
 * marmita suggestions.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ---------- Hoisted constants (available inside vi.mock factories) ----------
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
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: "patient-test-id" } }),
}));

vi.mock("@/integrations/supabase/client", () => {
  // Chainable thenable builder: chain methods return self; `await` resolves to {data,error}.
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
    b.then = (resolve: any, reject: any) =>
      Promise.resolve(result).then(resolve, reject);
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

// Replace framer-motion with passthroughs so AnimatePresence/motion don't
// hide content during jsdom tests.
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const passthrough = (props: any) => {
    const { children, ...rest } = props || {};
    // Strip framer-only props that React would warn about.
    const safe: any = {};
    for (const k of Object.keys(rest)) {
      if (
        ![
          "initial",
          "animate",
          "exit",
          "transition",
          "variants",
          "whileHover",
          "whileTap",
          "layout",
        ].includes(k)
      ) {
        safe[k] = rest[k];
      }
    }
    return React.createElement("div", safe, children);
  };
  return {
    AnimatePresence: ({ children }: any) => children,
    motion: new Proxy({}, { get: () => passthrough }),
  };
});

// ---------- Import under test (after mocks) ----------
import ExpandableMealPlanCard from "@/components/patient/ExpandableMealPlanCard";

function renderCard() {
  return render(
    <MemoryRouter>
      <ExpandableMealPlanCard />
    </MemoryRouter>,
  );
}

describe("ExpandableMealPlanCard - description rendering", () => {
  it("renders item.description in the 'Hoje' (today) tab", async () => {
    renderCard();

    // Wait for data to load and items to render
    await waitFor(
      () => {
        expect(document.body.innerHTML).toContain("MarmitaCarneMagra");
      },
      { timeout: 3000 },
    );

    // Description (multi-line) is shown directly on the card
    const html = document.body.innerHTML;
    expect(html).toContain("Patinho moído 80g");
    expect(html).toContain("Arroz integral 100g");
    expect(html).toContain("Brócolis 60g");
  });

  it("renders item.description in the 'Semanal' (weekly) tab", async () => {
    renderCard();

    await waitFor(() => {
      expect(document.body.innerHTML).toContain("MarmitaCarneMagra");
    }, { timeout: 3000 });

    // Switch to Weekly tab
    fireEvent.click(screen.getByRole("tab", { name: /Semanal/i }));

    // Click the day pill matching the second item's day_of_week.
    // Day pills are buttons inside a 7-column grid that contain DAYS_SHORT labels.
    const dayShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const targetLabel = dayShort[(TODAY_DOW + 1) % 7];

    await waitFor(() => {
      // Find buttons by role and then filter by text, being less strict with startsWith
      const buttons = screen.getAllByRole("button");
      const pills = buttons.filter((b) => (b.textContent || "").includes(targetLabel));
      
      expect(pills.length).toBeGreaterThan(0);
      fireEvent.click(pills[0]);
    }, { timeout: 3000 });

    await waitFor(
      () => {
        expect(document.body.innerHTML).toContain("MarmitaFrangoGrelhado");
      },
      { timeout: 3000 },
    );

    const html = document.body.innerHTML;
    expect(html).toContain("Frango grelhado 120g");
    expect(html).toContain("Batata doce 100g");
    expect(html).toContain("Salada verde");
  });

  it("renders item.description for ALL items in the 'Completo' (full) tab", async () => {
    renderCard();

    await waitFor(() => {
      expect(document.body.innerHTML).toContain("MarmitaCarneMagra");
    }, { timeout: 3000 });

    fireEvent.click(screen.getByRole("tab", { name: /Completo/i }));

    await waitFor(
      () => {
        expect(document.body.innerHTML).toContain("MarmitaFrangoGrelhado");
      },
      { timeout: 3000 },
    );

    const html = document.body.innerHTML;
    expect(html).toContain("Patinho moído 80g");
    expect(html).toContain("Frango grelhado 120g");
    expect(html).toContain("Salada verde");
  });
});
