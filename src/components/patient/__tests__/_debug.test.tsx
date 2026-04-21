import { describe, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: "p1" } }) }));

const TODAY = new Date().toISOString().split("T")[0];
const TODAY_DOW = new Date(TODAY + "T12:00:00").getDay();

function makeQB(data: any) {
  const b: any = {
    select: vi.fn(() => b), eq: vi.fn(() => b), gte: vi.fn(() => b),
    lte: vi.fn(() => b), order: vi.fn(() => b), limit: vi.fn(() => b),
    maybeSingle: vi.fn(() => Promise.resolve({ data, error: null })),
    then: (r: any) => r({ data, error: null }),
  };
  return b;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (t: string) => {
      console.log("FROM", t);
      if (t === "meal_plans") return makeQB({ id: "p1", title: "TitlePlan", start_date: TODAY });
      if (t === "meal_plan_items") return makeQB([{ id: "i1", title: "MyItemTitle", description: "MyDesc", meal_type: "lunch", day_of_week: TODAY_DOW, calories_target: 500, protein_target: 30, carbs_target: 40, fat_target: 10 }]);
      return makeQB([]);
    },
  },
}));

vi.mock("framer-motion", async () => {
  const a: any = await vi.importActual("framer-motion");
  return { ...a, AnimatePresence: ({ children }: any) => children, motion: new Proxy({}, { get: () => (p: any) => { const { children, ...r } = p || {}; return require("react").createElement("div", r, children); } }) };
});

import ExpandableMealPlanCard from "@/components/patient/ExpandableMealPlanCard";

describe("d", () => {
  it("d", async () => {
    const { container } = render(<MemoryRouter><ExpandableMealPlanCard /></MemoryRouter>);
    await waitFor(() => screen.getByText("TitlePlan"));
    await new Promise(r => setTimeout(r, 100));
    console.log("HTML:", container.innerHTML.substring(0, 3000));
  });
});
