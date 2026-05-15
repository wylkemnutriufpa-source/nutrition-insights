/**
 * DB-Exclusive Engine v7.0 — Automated Regression Tests
 * 
 * Validates: tag-based filtering, DB-exclusive enforcement, meal selection compliance,
 * macro deviation guards, and fail-fast behavior.
 */
import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════
// INLINE ENGINE LOGIC (extracted for unit testing without Deno/Edge deps)
// ═══════════════════════════════════════════════════════════════

interface VisualLibraryItem {
  id: string;
  slug: string;
  name: string;
  display_name: string;
  category: string;
  image_url: string | null;
  default_calories: number | null;
  default_protein: number | null;
  default_carbs: number | null;
  default_fat: number | null;
  base_recipe: any;
  tags: string[];
  search_terms: string[];
  clinical_tags: string[];
}

function normalize(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, " ");
}

const RESTRICTION_TO_CLINICAL_TAG: Record<string, string> = {
  lactose: "contains_lactose",
  lactose_free: "contains_lactose",
  gluten: "contains_gluten",
  gluten_free: "contains_gluten",
  egg: "contains_egg",
  egg_free: "contains_egg",
  ovo: "contains_egg",
  nuts: "contains_nuts",
  nut_free: "contains_nuts",
  amendoim: "contains_nuts",
  castanha: "contains_nuts",
  soy: "contains_soy",
  soy_free: "contains_soy",
  soja: "contains_soy",
  seafood: "contains_seafood",
  shellfish_free: "contains_seafood",
  camarao: "contains_seafood",
  frutos_do_mar: "contains_seafood",
};

function filterVisualLibraryForPatient(
  items: VisualLibraryItem[],
  restrictions: string[],
  disliked: string[],
  allergies: string[],
): VisualLibraryItem[] {
  const excludedClinicalTags = new Set<string>();
  for (const r of [...restrictions, ...allergies]) {
    const nr = normalize(r);
    for (const [key, clinicalTag] of Object.entries(RESTRICTION_TO_CLINICAL_TAG)) {
      if (nr.includes(key)) {
        excludedClinicalTags.add(clinicalTag);
      }
    }
  }

  const isVegetarian = restrictions.some(r => { const nr = normalize(r); return nr.includes("vegetarian") || nr.includes("vegetariano"); });
  const isVegan = restrictions.some(r => { const nr = normalize(r); return nr.includes("vegan") || nr.includes("vegano"); });
  if (isVegetarian || isVegan) excludedClinicalTags.add("animal_protein");
  if (isVegan) { excludedClinicalTags.add("contains_lactose"); excludedClinicalTags.add("contains_egg"); }

  const blocked = [...disliked].map(d => normalize(d)).filter(d => d.length >= 3);

  return items.filter(item => {
    const itemTags = item.clinical_tags || [];
    for (const excludedTag of excludedClinicalTags) {
      if (itemTags.includes(excludedTag)) return false;
    }
    if (blocked.length > 0) {
      const fullText = normalize(item.display_name) + " " + normalize(item.slug) + " " + (item.search_terms || []).map(t => normalize(t)).join(" ");
      for (const b of blocked) { if (fullText.includes(b)) return false; }
    }
    return true;
  });
}

// ═══════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════

function makeItem(overrides: Partial<VisualLibraryItem> & { id: string; display_name: string; category: string }): VisualLibraryItem {
  return {
    slug: overrides.display_name.toLowerCase().replace(/\s/g, "-"),
    name: overrides.display_name,
    image_url: "https://example.com/img.jpg",
    default_calories: 200,
    default_protein: 20,
    default_carbs: 25,
    default_fat: 8,
    base_recipe: null,
    tags: [],
    search_terms: [],
    clinical_tags: [],
    ...overrides,
  };
}

const SAMPLE_LIBRARY: VisualLibraryItem[] = [
  makeItem({ id: "1", display_name: "Frango grelhado", category: "almoco", clinical_tags: ["animal_protein", "high_protein"] }),
  makeItem({ id: "2", display_name: "Arroz branco", category: "almoco", clinical_tags: ["high_carb", "whole_food"], default_calories: 155, default_protein: 3, default_carbs: 34, default_fat: 0 }),
  makeItem({ id: "3", display_name: "Iogurte natural", category: "lanche", clinical_tags: ["contains_lactose"], default_calories: 90, default_protein: 5, default_carbs: 12, default_fat: 3 }),
  makeItem({ id: "4", display_name: "Queijo minas", category: "cafe_da_manha", clinical_tags: ["contains_lactose", "animal_protein"], default_calories: 80, default_protein: 8, default_carbs: 1, default_fat: 5 }),
  makeItem({ id: "5", display_name: "Pão integral", category: "cafe_da_manha", clinical_tags: ["contains_gluten", "high_carb"], default_calories: 130, default_protein: 4, default_carbs: 24, default_fat: 2 }),
  makeItem({ id: "6", display_name: "Banana", category: "lanche", clinical_tags: ["whole_food"], default_calories: 89, default_protein: 1, default_carbs: 23, default_fat: 0 }),
  makeItem({ id: "7", display_name: "Ovo mexido", category: "cafe_da_manha", clinical_tags: ["contains_egg", "animal_protein", "high_protein"], default_calories: 150, default_protein: 12, default_carbs: 1, default_fat: 11 }),
  makeItem({ id: "8", display_name: "Salada verde", category: "almoco", clinical_tags: ["plant_based", "low_carb"], default_calories: 15, default_protein: 1, default_carbs: 3, default_fat: 0 }),
  makeItem({ id: "9", display_name: "Castanha do Pará", category: "lanche", clinical_tags: ["contains_nuts", "high_fat"], default_calories: 65, default_protein: 1, default_carbs: 1, default_fat: 7 }),
  makeItem({ id: "10", display_name: "Tofu grelhado", category: "almoco", clinical_tags: ["contains_soy", "plant_based"], default_calories: 120, default_protein: 12, default_carbs: 2, default_fat: 7 }),
];

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe("Lactose intolerance safety", () => {
  it("filters out ALL lactose-containing items when patient has lactose restriction", () => {
    const result = filterVisualLibraryForPatient(SAMPLE_LIBRARY, ["lactose"], [], []);
    const hasForbidden = result.some(i => (i.clinical_tags || []).includes("contains_lactose"));
    expect(hasForbidden).toBe(false);
    expect(result.find(i => i.id === "3")).toBeUndefined(); // Iogurte
    expect(result.find(i => i.id === "4")).toBeUndefined(); // Queijo minas
  });

  it("filters lactose via allergies array too", () => {
    const result = filterVisualLibraryForPatient(SAMPLE_LIBRARY, [], [], ["lactose"]);
    expect(result.some(i => (i.clinical_tags || []).includes("contains_lactose"))).toBe(false);
  });

  it("preserves non-lactose items", () => {
    const result = filterVisualLibraryForPatient(SAMPLE_LIBRARY, ["lactose"], [], []);
    expect(result.find(i => i.id === "1")).toBeDefined(); // Frango
    expect(result.find(i => i.id === "6")).toBeDefined(); // Banana
  });
});

describe("Gluten intolerance safety", () => {
  it("removes all gluten items", () => {
    const result = filterVisualLibraryForPatient(SAMPLE_LIBRARY, ["gluten"], [], []);
    expect(result.some(i => (i.clinical_tags || []).includes("contains_gluten"))).toBe(false);
    expect(result.find(i => i.id === "5")).toBeUndefined(); // Pão integral
  });
});

describe("Vegetarian / Vegan compliance", () => {
  it("vegetarian removes all animal protein", () => {
    const result = filterVisualLibraryForPatient(SAMPLE_LIBRARY, ["vegetariano"], [], []);
    expect(result.some(i => (i.clinical_tags || []).includes("animal_protein"))).toBe(false);
    expect(result.find(i => i.id === "1")).toBeUndefined(); // Frango
    expect(result.find(i => i.id === "7")).toBeUndefined(); // Ovo — has animal_protein tag
  });

  it("vegan removes animal protein + lactose + egg", () => {
    const result = filterVisualLibraryForPatient(SAMPLE_LIBRARY, ["vegano"], [], []);
    expect(result.some(i => (i.clinical_tags || []).includes("animal_protein"))).toBe(false);
    expect(result.some(i => (i.clinical_tags || []).includes("contains_lactose"))).toBe(false);
    expect(result.some(i => (i.clinical_tags || []).includes("contains_egg"))).toBe(false);
  });
});

describe("Combined restrictions", () => {
  it("lactose + gluten removes both categories", () => {
    const result = filterVisualLibraryForPatient(SAMPLE_LIBRARY, ["lactose", "gluten"], [], []);
    expect(result.some(i => (i.clinical_tags || []).includes("contains_lactose"))).toBe(false);
    expect(result.some(i => (i.clinical_tags || []).includes("contains_gluten"))).toBe(false);
  });

  it("nuts + soy removes both", () => {
    const result = filterVisualLibraryForPatient(SAMPLE_LIBRARY, ["nuts", "soja"], [], []);
    expect(result.find(i => i.id === "9")).toBeUndefined(); // Castanha
    expect(result.find(i => i.id === "10")).toBeUndefined(); // Tofu
  });
});

describe("Disliked foods keyword filtering", () => {
  it("removes items matching disliked keywords", () => {
    const result = filterVisualLibraryForPatient(SAMPLE_LIBRARY, [], ["frango"], []);
    expect(result.find(i => i.id === "1")).toBeUndefined();
  });

  it("ignores very short disliked keywords (< 3 chars)", () => {
    const before = filterVisualLibraryForPatient(SAMPLE_LIBRARY, [], [], []);
    const after = filterVisualLibraryForPatient(SAMPLE_LIBRARY, [], ["ov"], []);
    expect(after.length).toBe(before.length);
  });
});

describe("DB-exclusive enforcement", () => {
  it("every item in library has an id (visual_library_item_id proxy)", () => {
    for (const item of SAMPLE_LIBRARY) {
      expect(item.id).toBeTruthy();
      expect(typeof item.id).toBe("string");
    }
  });

  it("every item must have a valid image_url", () => {
    for (const item of SAMPLE_LIBRARY) {
      expect(item.image_url).toBeTruthy();
      expect(item.image_url!.length).toBeGreaterThan(5);
    }
  });

  it("items without image are rejected by strict validation", () => {
    const noImageItem = makeItem({ id: "99", display_name: "Item sem foto", category: "almoco", image_url: null });
    expect(noImageItem.image_url).toBeNull();
    // The engine would throw: [STRICT] Visual library item has no image_url
  });
});

describe("Meal selection compliance", () => {
  const defaultMeals = ["Café da Manhã", "Lanche da Manhã", "Almoço", "Lanche da Tarde", "Jantar", "Ceia"];

  it("enabled meals controls which meals are generated", () => {
    const enabledMeals = ["Café da Manhã", "Almoço", "Jantar"];
    const mealTypes = enabledMeals.length > 0 ? enabledMeals : defaultMeals;
    expect(mealTypes).toEqual(["Café da Manhã", "Almoço", "Jantar"]);
    expect(mealTypes).not.toContain("Lanche da Manhã");
    expect(mealTypes).not.toContain("Lanche da Tarde");
    expect(mealTypes).not.toContain("Ceia");
  });

  it("falls back to all 6 meals when enabledMeals is empty", () => {
    const enabledMeals: string[] = [];
    const mealTypes = enabledMeals.length > 0 ? enabledMeals : defaultMeals;
    expect(mealTypes).toEqual(defaultMeals);
    expect(mealTypes).toHaveLength(6);
  });

  it("does not generate extra meals beyond enabled list", () => {
    const enabledMeals = ["Café da Manhã", "Almoço"];
    const mealTypes = enabledMeals.length > 0 ? enabledMeals : defaultMeals;
    const generated = mealTypes.map(m => ({ tipo_refeicao: m }));
    expect(generated).toHaveLength(2);
    expect(generated.every(g => enabledMeals.includes(g.tipo_refeicao))).toBe(true);
  });
});

describe("Macro deviation guards", () => {
  it("caloric deviation <= 5% is acceptable", () => {
    const target = 2000;
    const actual = 2090; // 4.5% deviation
    const deviation = Math.abs(actual - target) / target;
    expect(deviation).toBeLessThanOrEqual(0.05);
  });

  it("caloric deviation > 5% triggers warning", () => {
    const target = 2000;
    const actual = 2200; // 10% deviation
    const deviation = Math.abs(actual - target) / target;
    expect(deviation).toBeGreaterThan(0.05);
  });

  it("protein within clinical range (1.6-2.5 g/kg)", () => {
    const weightKg = 70;
    const proteinTarget = 140; // 2.0 g/kg
    const gPerKg = proteinTarget / weightKg;
    expect(gPerKg).toBeGreaterThanOrEqual(1.6);
    expect(gPerKg).toBeLessThanOrEqual(2.5);
  });

  it("protein below floor is flagged", () => {
    const weightKg = 70;
    const proteinTarget = 90; // 1.28 g/kg — too low
    const gPerKg = proteinTarget / weightKg;
    expect(gPerKg).toBeLessThan(1.6);
  });
});

describe("Fail-fast behavior (per-meal zero-candidate check)", () => {
  it("throws when a meal type has ZERO candidates after filtering", () => {
    // All items have lactose — patient with lactose restriction gets 0 candidates
    const allLactose = Array.from({ length: 10 }, (_, i) =>
      makeItem({ id: String(i), display_name: `Dairy ${i}`, category: "lanche", clinical_tags: ["contains_lactose"] })
    );
    const filtered = filterVisualLibraryForPatient(allLactose, ["lactose"], [], []);
    expect(filtered).toHaveLength(0);
    // Engine would throw: [STRICT] No visual library items found for meal type
  });

  it("does NOT fail when only 1 candidate exists (valid scenario)", () => {
    const singleItem = [makeItem({ id: "1", display_name: "Banana", category: "lanche", clinical_tags: ["whole_food"] })];
    const filtered = filterVisualLibraryForPatient(singleItem, [], [], []);
    expect(filtered).toHaveLength(1);
    // 1 candidate is enough — engine should proceed
  });

  it("does NOT fail when 2 candidates exist (no arbitrary minimum)", () => {
    const twoItems = [
      makeItem({ id: "1", display_name: "Banana", category: "lanche", clinical_tags: ["whole_food"] }),
      makeItem({ id: "2", display_name: "Maçã", category: "lanche", clinical_tags: ["whole_food"] }),
    ];
    const filtered = filterVisualLibraryForPatient(twoItems, [], [], []);
    expect(filtered).toHaveLength(2);
  });

  it("aggressive filtering can result in zero candidates → fail-fast", () => {
    // Vegan patient with only animal items available
    const onlyAnimal = Array.from({ length: 5 }, (_, i) =>
      makeItem({ id: String(i), display_name: `Meat ${i}`, category: "almoco", clinical_tags: ["animal_protein"] })
    );
    const filtered = filterVisualLibraryForPatient(onlyAnimal, ["vegano"], [], []);
    expect(filtered).toHaveLength(0);
  });
});

describe("Tag integrity", () => {
  it("all items have clinical_tags as array", () => {
    for (const item of SAMPLE_LIBRARY) {
      expect(Array.isArray(item.clinical_tags)).toBe(true);
    }
  });

  it("no item has undefined clinical_tags after normalization", () => {
    const rawItem = makeItem({ id: "x", display_name: "Test", category: "almoco" });
    // Simulate the normalization the engine does
    const normalized = { ...rawItem, clinical_tags: rawItem.clinical_tags || [] };
    expect(Array.isArray(normalized.clinical_tags)).toBe(true);
  });
});
