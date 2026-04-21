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
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ---------- Mocks ----------

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: "patient-test-id" } }),
}));

// Use vi.hoisted so these constants are available inside the (hoisted) vi.mock factory.
const { TODAY, TODAY_DOW, ITEMS } = vi.hoisted(() => {
  const TODAY = new Date().toISOString().split("T")[0];
  const TODAY_DOW = new Date(TODAY + "T12:00:00").getDay();
  const ITEMS = [
    {
      id: "item-lunch-today",
      title: "Marmita Carne Magra",
      description: "Patinho moído 80g\nArroz integral 100g\nBrócolis 60g",
      meal_type: "lunch",
      day_of_week: TODAY_DOW,
      calories_target: 520,
      protein_target: 35,
      carbs_target: 50,
      fat_target: 15,
    },
    {
      id: "item-dinner-other-day",
      title: "Marmita Frango Grelhado",
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

// Chainable Supabase query mock — all chain methods return the builder.
// The builder is a thenable, so `await builder` resolves to { data, error }.
function makeQueryBuilder(returnData: any) {
  const result = { data: returnData, error: null };
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: any, reject: any) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      // eslint-disable-next-line no-console
      console.log("MOCK_FROM:", table, "ITEMS_LEN:", ITEMS?.length);
      if (table === "meal_plans") {
        return makeQueryBuilder({
          id: "plan-1",
          title: "Plano Wannubia Marmita Semanal",
          start_date: TODAY,
        });
      }
      if (table === "meal_plan_items") {
        return makeQueryBuilder(ITEMS);
      }
      if (table === "meal_item_completions") {
        return makeQueryBuilder([]);
      }
      return makeQueryBuilder([]);
    },
  },
}));

// Avoid framer-motion AnimatePresence height transition swallowing content in jsdom
vi.mock("framer-motion", async () => {
  const actual: any = await vi.importActual("framer-motion");
  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: new Proxy(
      {},
      {
        get: () => (props: any) => {
          const { children, ...rest } = props || {};
          return <div {...rest}>{children}</div>;
        },
      },
    ),
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders item.description in the 'Hoje' (today) tab", async () => {
    renderCard();

    // Wait for plan to load (title appears)
    await waitFor(() =>
      expect(screen.getByText("Plano Wannubia Marmita Semanal")).toBeInTheDocument(),
    );

    await new Promise((r) => setTimeout(r, 200));
    const html = document.body.innerHTML;
    const idx = html.lastIndexOf("Hoje —");
    // eslint-disable-next-line no-console
    console.log("ITEMS_AREA:", html.substring(idx, idx + 1500));

    // Today's lunch item title is visible
    expect(await screen.findByText("Marmita Carne Magra")).toBeInTheDocument();

    // Its description should also be visible (whitespace-pre-line keeps newlines)
    expect(
      screen.getByText((content) => content.includes("Patinho moído 80g")),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("Arroz integral 100g")),
    ).toBeInTheDocument();
  });

  it("renders item.description in the 'Semanal' (weekly) tab when selecting a day", async () => {
    renderCard();
    await waitFor(() =>
      expect(screen.getByText("Plano Wannubia Marmita Semanal")).toBeInTheDocument(),
    );

    // Switch to weekly tab
    fireEvent.click(screen.getByRole("tab", { name: /Semanal/i }));

    // Find the day pill for the dinner item's day and click it
    const dayShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const targetDayLabel = dayShort[(TODAY_DOW + 1) % 7];

    // Click the day button containing the short label
    const dayButtons = screen.getAllByRole("button");
    const targetButton = dayButtons.find((b) =>
      within(b).queryByText(targetDayLabel),
    );
    expect(targetButton).toBeTruthy();
    fireEvent.click(targetButton!);

    // Dinner item appears with its description
    expect(await screen.findByText("Marmita Frango Grelhado")).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("Frango grelhado 120g")),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("Batata doce 100g")),
    ).toBeInTheDocument();
  });

  it("renders item.description for ALL items in the 'Completo' (full) tab", async () => {
    renderCard();
    await waitFor(() =>
      expect(screen.getByText("Plano Wannubia Marmita Semanal")).toBeInTheDocument(),
    );

    // Switch to full tab
    fireEvent.click(screen.getByRole("tab", { name: /Completo/i }));

    // Both items' titles
    expect(await screen.findByText("Marmita Carne Magra")).toBeInTheDocument();
    expect(screen.getByText("Marmita Frango Grelhado")).toBeInTheDocument();

    // Both items' descriptions
    expect(
      screen.getByText((c) => c.includes("Patinho moído 80g")),
    ).toBeInTheDocument();
    expect(
      screen.getByText((c) => c.includes("Frango grelhado 120g")),
    ).toBeInTheDocument();
    expect(
      screen.getByText((c) => c.includes("Salada verde")),
    ).toBeInTheDocument();
  });
});
