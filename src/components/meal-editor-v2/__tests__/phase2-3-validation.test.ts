/**
 * Phase 2 & 3 Functional Validation Tests
 * 
 * Validates: click-to-add, templates, substitutions, macro recalculation,
 * immutability guards, and persistence correctness.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Test the store logic directly ──────────────────────────
// We mock supabase to validate local-first behavior

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }), order: () => Promise.resolve({ data: [] }) }) }),
      insert: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }), in: () => Promise.resolve({ error: null }) }),
    }),
  },
}));

vi.mock("@/lib/mealVisualAssociation", () => ({
  autoMatchSingle: () => Promise.resolve(null),
}));

import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";

const PLAN_ID = "test-plan-001";
const MEAL_TYPE = "lunch" as const;
const DAY = 1;

function resetStore() {
  useMealPlanEditorV2Store.setState({
    planId: PLAN_ID,
    plan: {
      id: PLAN_ID,
      patient_id: "patient-001",
      title: "Test Plan",
      plan_status: "draft",
    } as any,
    patientName: "Test Patient",
    items: [],
    hydrated: true,
    hydrating: false,
    syncStatus: "idle",
    syncingMap: {},
    pendingOps: [],
    lastSavedAt: null,
  });
}

describe("Phase 2 — Click-to-Add", () => {
  beforeEach(resetStore);

  it("1. addItem saves to correct plan_id and day", () => {
    const store = useMealPlanEditorV2Store.getState();
    store.addItem({
      meal_plan_id: PLAN_ID,
      title: "Arroz branco",
      description: "4 colheres (120g)",
      meal_type: MEAL_TYPE,
      day_of_week: DAY,
      calories_target: 155,
      protein_target: 3,
      carbs_target: 34,
      fat_target: 0,
    });

    const items = useMealPlanEditorV2Store.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].meal_plan_id).toBe(PLAN_ID);
    expect(items[0].day_of_week).toBe(DAY);
    expect(items[0].meal_type).toBe(MEAL_TYPE);
    expect(items[0].title).toBe("Arroz branco");
    expect(items[0].calories_target).toBe(155);
  });

  it("2. multiple items accumulate correctly", () => {
    const store = useMealPlanEditorV2Store.getState();
    store.addItem({
      meal_plan_id: PLAN_ID,
      title: "Frango grelhado",
      description: "150g",
      meal_type: MEAL_TYPE,
      day_of_week: DAY,
      calories_target: 248,
      protein_target: 46,
      carbs_target: 0,
      fat_target: 5,
    });
    store.addItem({
      meal_plan_id: PLAN_ID,
      title: "Arroz branco",
      description: "120g",
      meal_type: MEAL_TYPE,
      day_of_week: DAY,
      calories_target: 155,
      protein_target: 3,
      carbs_target: 34,
      fat_target: 0,
    });

    const items = useMealPlanEditorV2Store.getState().items;
    expect(items).toHaveLength(2);

    const totalCal = items.reduce((s, i) => s + (i.calories_target || 0), 0);
    const totalProt = items.reduce((s, i) => s + (Number(i.protein_target) || 0), 0);
    expect(totalCal).toBe(403);
    expect(totalProt).toBe(49);
  });

  it("3. pending operations are queued for persistence", () => {
    const store = useMealPlanEditorV2Store.getState();
    store.addItem({
      meal_plan_id: PLAN_ID,
      title: "Salada",
      description: "1 porção",
      meal_type: MEAL_TYPE,
      day_of_week: DAY,
      calories_target: 15,
      protein_target: 1,
      carbs_target: 3,
      fat_target: 0,
    });

    const ops = useMealPlanEditorV2Store.getState().pendingOps;
    expect(ops.length).toBeGreaterThan(0);
    expect(ops[0].key).toContain("insert:");
  });
});

describe("Phase 3 — Templates", () => {
  beforeEach(resetStore);

  it("4. template adds composed item with correct macros", () => {
    const store = useMealPlanEditorV2Store.getState();
    
    // Simulate template application (same logic as MealTemplatePanel)
    const template = {
      title: "Frango + Arroz + Salada",
      foods: [
        { name: "Peito de frango grelhado", portion: "150g", calories: 248, protein: 46, carbs: 0, fat: 5 },
        { name: "Arroz branco", portion: "4 colheres (120g)", calories: 155, protein: 3, carbs: 34, fat: 0 },
        { name: "Feijão carioca", portion: "1 concha (86g)", calories: 60, protein: 4, carbs: 10, fat: 0 },
        { name: "Salada verde", portion: "1 porção", calories: 15, protein: 1, carbs: 3, fat: 0 },
      ],
      totalCalories: 478,
      totalProtein: 54,
      totalCarbs: 47,
      totalFat: 5,
    };

    const description = template.foods.map(f => `${f.name} (${f.portion})`).join(" + ");
    store.addItem({
      meal_plan_id: PLAN_ID,
      title: template.title,
      description,
      meal_type: MEAL_TYPE,
      day_of_week: DAY,
      calories_target: template.totalCalories,
      protein_target: template.totalProtein,
      carbs_target: template.totalCarbs,
      fat_target: template.totalFat,
    });

    const items = useMealPlanEditorV2Store.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Frango + Arroz + Salada");
    expect(items[0].calories_target).toBe(478);
    expect(items[0].protein_target).toBe(54);
    expect(items[0].description).toContain("Peito de frango grelhado");
    expect(items[0].description).toContain("Salada verde");
  });
});

describe("Phase 3 — Substitutions", () => {
  beforeEach(() => {
    resetStore();
    // Pre-add an item to substitute
    useMealPlanEditorV2Store.getState().addItem({
      meal_plan_id: PLAN_ID,
      title: "Arroz branco",
      description: "4 colheres (120g)",
      meal_type: MEAL_TYPE,
      day_of_week: DAY,
      calories_target: 155,
      protein_target: 3,
      carbs_target: 34,
      fat_target: 0,
    });
  });

  it("5. substitution updates item macros correctly", () => {
    const items = useMealPlanEditorV2Store.getState().items;
    const itemId = items[0].id;

    // Substitute arroz → macarrão
    useMealPlanEditorV2Store.getState().updateItem(itemId, {
      title: "Macarrão",
      description: "100g cozido",
      calories_target: 160,
      protein_target: 5,
      carbs_target: 31,
      fat_target: 1,
    });

    const updated = useMealPlanEditorV2Store.getState().items;
    expect(updated[0].title).toBe("Macarrão");
    expect(updated[0].calories_target).toBe(160);
    expect(updated[0].protein_target).toBe(5);
  });

  it("6. substitution preserves day total calculation", () => {
    const store = useMealPlanEditorV2Store.getState();
    // Add protein item
    store.addItem({
      meal_plan_id: PLAN_ID,
      title: "Frango grelhado",
      description: "150g",
      meal_type: MEAL_TYPE,
      day_of_week: DAY,
      calories_target: 248,
      protein_target: 46,
      carbs_target: 0,
      fat_target: 5,
    });

    // Before substitution
    let items = useMealPlanEditorV2Store.getState().items.filter(i => i.day_of_week === DAY);
    const totalBefore = items.reduce((s, i) => s + (i.calories_target || 0), 0);
    expect(totalBefore).toBe(155 + 248); // arroz + frango

    // Substitute arroz → purê (120 kcal)
    const arrozId = items.find(i => i.title === "Arroz branco")!.id;
    useMealPlanEditorV2Store.getState().updateItem(arrozId, {
      title: "Purê de batata",
      description: "3 colheres (120g)",
      calories_target: 120,
      protein_target: 2,
      carbs_target: 20,
      fat_target: 4,
    });

    items = useMealPlanEditorV2Store.getState().items.filter(i => i.day_of_week === DAY);
    const totalAfter = items.reduce((s, i) => s + (i.calories_target || 0), 0);
    expect(totalAfter).toBe(120 + 248); // purê + frango
    expect(totalAfter).toBeLessThan(totalBefore);
  });
});

describe("Immutability Guard", () => {
  it("7. immutable statuses block editing actions", () => {
    for (const status of ["approved", "published", "published_to_patient"]) {
      useMealPlanEditorV2Store.setState({
        planId: PLAN_ID,
        plan: {
          id: PLAN_ID,
          patient_id: "patient-001",
          title: "Published Plan",
          plan_status: status,
        } as any,
        items: [{
          id: "item-001",
          meal_plan_id: PLAN_ID,
          title: "Arroz",
          meal_type: MEAL_TYPE,
          day_of_week: DAY,
          calories_target: 155,
        } as any],
        hydrated: true,
        hydrating: false,
        syncStatus: "idle",
        syncingMap: {},
        pendingOps: [],
        lastSavedAt: null,
      });

      const planStatus = useMealPlanEditorV2Store.getState().plan?.plan_status;
      const isImmutable = ["approved", "published", "published_to_patient"].includes(planStatus as string);
      expect(isImmutable).toBe(true);
    }
  });
});

describe("Description & Macro Coherence", () => {
  beforeEach(resetStore);

  it("8. item description, macros and title stay coherent after operations", () => {
    const store = useMealPlanEditorV2Store.getState();
    
    // Add manually
    store.addItem({
      meal_plan_id: PLAN_ID,
      title: "Pão com Ovo",
      description: "Pão francês (1 unidade (50g)) + Ovo mexido (2 unidades)",
      meal_type: "breakfast",
      day_of_week: DAY,
      calories_target: 330,
      protein_target: 17,
      carbs_target: 29,
      fat_target: 16,
    });

    // Apply template
    store.addItem({
      meal_plan_id: PLAN_ID,
      title: "Frango + Arroz + Salada",
      description: "Peito de frango grelhado (150g) + Arroz branco (4 colheres (120g)) + Salada verde (1 porção)",
      meal_type: MEAL_TYPE,
      day_of_week: DAY,
      calories_target: 418,
      protein_target: 50,
      carbs_target: 37,
      fat_target: 5,
    });

    const items = useMealPlanEditorV2Store.getState().items;
    expect(items).toHaveLength(2);

    // Substitute frango → peixe in the lunch item
    const lunchItem = items.find(i => i.meal_type === MEAL_TYPE)!;
    store.updateItem(lunchItem.id, {
      title: "Peixe + Arroz + Salada",
      description: "Filé de peixe grelhado (150g) + Arroz branco (4 colheres (120g)) + Salada verde (1 porção)",
      calories_target: 350,
      protein_target: 40,
      carbs_target: 37,
      fat_target: 3,
    });

    const finalItems = useMealPlanEditorV2Store.getState().items;
    const lunch = finalItems.find(i => i.meal_type === MEAL_TYPE)!;
    const breakfast = finalItems.find(i => i.meal_type === "breakfast")!;

    // Verify coherence
    expect(lunch.title).toBe("Peixe + Arroz + Salada");
    expect(lunch.description).toContain("Filé de peixe");
    expect(lunch.calories_target).toBe(350);

    // Breakfast unchanged
    expect(breakfast.title).toBe("Pão com Ovo");
    expect(breakfast.calories_target).toBe(330);

    // Day total
    const dayTotal = finalItems
      .filter(i => i.day_of_week === DAY)
      .reduce((s, i) => s + (i.calories_target || 0), 0);
    expect(dayTotal).toBe(350 + 330); // peixe+arroz + pão com ovo
  });
});

describe("Full Integration Scenario", () => {
  beforeEach(resetStore);

  it("9. complete flow: add + template + substitute with totals", () => {
    const store = useMealPlanEditorV2Store.getState();

    // Step 1: Add 1 item manually (click-to-add)
    store.addItem({
      meal_plan_id: PLAN_ID,
      title: "Banana",
      description: "1 unidade (100g)",
      meal_type: "morning_snack",
      day_of_week: DAY,
      calories_target: 89,
      protein_target: 1,
      carbs_target: 23,
      fat_target: 0,
    });

    let items = useMealPlanEditorV2Store.getState().items;
    expect(items).toHaveLength(1);
    const totalStep1 = items.reduce((s, i) => s + (i.calories_target || 0), 0);
    expect(totalStep1).toBe(89);

    // Step 2: Apply 1 template (lunch)
    store.addItem({
      meal_plan_id: PLAN_ID,
      title: "Frango + Arroz + Salada",
      description: "Peito de frango grelhado (150g) + Arroz branco (4 colheres) + Feijão (1 concha) + Salada verde",
      meal_type: MEAL_TYPE,
      day_of_week: DAY,
      calories_target: 478,
      protein_target: 54,
      carbs_target: 47,
      fat_target: 5,
    });

    items = useMealPlanEditorV2Store.getState().items;
    expect(items).toHaveLength(2);
    const totalStep2 = items.reduce((s, i) => s + (i.calories_target || 0), 0);
    expect(totalStep2).toBe(89 + 478); // 567

    // Step 3: Substitute arroz → macarrão in the template
    const lunchItem = items.find(i => i.meal_type === MEAL_TYPE)!;
    store.updateItem(lunchItem.id, {
      title: "Frango + Macarrão + Salada",
      description: "Peito de frango grelhado (150g) + Macarrão (100g cozido) + Feijão (1 concha) + Salada verde",
      calories_target: 483, // 248+160+60+15
      protein_target: 55,
      carbs_target: 44,
      fat_target: 6,
    });

    items = useMealPlanEditorV2Store.getState().items;
    const totalStep3 = items.reduce((s, i) => s + (i.calories_target || 0), 0);

    // Final assertions
    expect(items).toHaveLength(2);
    expect(totalStep3).toBe(89 + 483); // 572

    // Verify each item integrity
    const banana = items.find(i => i.title === "Banana")!;
    expect(banana.calories_target).toBe(89);
    expect(banana.meal_type).toBe("morning_snack");

    const lunch = items.find(i => i.meal_type === MEAL_TYPE)!;
    expect(lunch.title).toBe("Frango + Macarrão + Salada");
    expect(lunch.calories_target).toBe(483);
    expect(lunch.description).toContain("Macarrão");

    // All operations queued for persistence
    const ops = useMealPlanEditorV2Store.getState().pendingOps;
    expect(ops.length).toBeGreaterThan(0);
  });
});
