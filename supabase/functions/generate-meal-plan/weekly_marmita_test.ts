
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { generateWeeklyMarmitaPlan, buildMarmitaItem, estimateRecipeMacros, type MarmitaRecipe } from "./index.ts";

Deno.test("weekly_marmita: buildMarmitaItem correctly scales macros and grams", async () => {
  const recipe: MarmitaRecipe = {
    id: "r1",
    name: "Frango com Arroz",
    meal_type: "almoço",
    foods_json: [
      { name: "Frango", grams: 100 },
      { name: "Arroz", grams: 100 }
    ],
    is_scalable: true
  };

  const targetKcal = 600;
  const baseMacros = estimateRecipeMacros(recipe);
  assertEquals(baseMacros.cal, 350); 

  const item = await buildMarmitaItem(null, recipe, "lunch", 0, targetKcal, "manutencao", []);
  const scale = targetKcal / 350;
  assertEquals(item.calories_target, 600);
  assertEquals(item.description.includes("171g Frango"), true);
  assertEquals(item.description.includes("171g Arroz"), true);
});

Deno.test("weekly_marmita: buildMarmitaItem preserves grammages when is_scalable is false", async () => {
  const recipe: MarmitaRecipe = {
    id: "r2",
    name: "Frango Fixo",
    meal_type: "almoço",
    foods_json: [
      { name: "Frango", grams: 150 }
    ],
    is_scalable: false
  };

  const targetKcal = 800; 
  const item = await buildMarmitaItem(null, recipe, "lunch", 0, targetKcal, "manutencao", [], {}, { protein: 100, carbs: 100, fat: 30 });
  assertEquals(item.description.includes("150g Frango"), true);

  const base = estimateRecipeMacros(recipe);
  assertEquals(item.calories_target, base.cal);
  assertEquals(item.protein_target, base.p);
  assertEquals(item.carbs_target, base.c);
});

Deno.test("weekly_marmita: estimateRecipeMacros handles empty ingredients", () => {
  const recipe: MarmitaRecipe = {
    id: "r-empty",
    name: "Vazia",
    meal_type: "almoço",
    foods_json: []
  };
  
  const macros = estimateRecipeMacros(recipe);
  assertEquals(macros.cal, 350); // Floor
  assertEquals(macros.p, 35);
  assertEquals(macros.c > 0, true);
});

Deno.test("weekly_marmita: estimateRecipeMacros respects fixed values", () => {
  const recipe: MarmitaRecipe = {
    id: "r-fixed",
    name: "Fixa",
    meal_type: "almoço",
    foods_json: [{ name: "X", grams: 100 }],
    fixed_calories: 500,
    fixed_protein: 40,
    fixed_carbs: 50,
    fixed_fat: 10
  };
  
  const macros = estimateRecipeMacros(recipe);
  assertEquals(macros.cal, 500);
  assertEquals(macros.p, 40);
  assertEquals(macros.c, 50);
  assertEquals(macros.f, 10);
});

Deno.test("weekly_marmita: buildMarmitaItem handles empty ingredients without crashing", () => {
  const recipe: MarmitaRecipe = {
    id: "r-crash",
    name: "Sem Nada",
    meal_type: "almoço",
    foods_json: []
  };
  
  const item = buildMarmitaItem(recipe, "lunch", 0, 500, "manutencao", []);
  assertEquals(item.title.includes("Sem Nada"), true);
  assertEquals(item.calories_target > 0, true);
});

Deno.test("weekly_marmita: generateWeeklyMarmitaPlan distributes macros correctly", () => {
  const recipes: MarmitaRecipe[] = [
    { id: "l1", name: "Almoço 1", meal_type: "almoço", foods_json: [{ name: "F", grams: 100 }] },
    { id: "d1", name: "Jantar 1", meal_type: "jantar", foods_json: [{ name: "F", grams: 100 }] }
  ];
  
  const kcalTarget = 2000;
  const macros = { protein: 150, carbs: 200, fat: 60 };
  
  const result = generateWeeklyMarmitaPlan(
    recipes, [], [], "manutencao", kcalTarget, macros, [], [], [], ["lunch", "dinner"]
  );
  
  assertEquals(result.items.length, 14); 
  
  const lunch = result.items.find(i => i.day_of_week === 0 && i.meal_type === "lunch");
  const dinner = result.items.find(i => i.day_of_week === 0 && i.meal_type === "dinner");
  
  assertEquals(lunch.calories_target, 600); // 2000 * 0.3
  assertEquals(dinner.calories_target, 440); // 2000 * 0.22
  assertEquals(lunch.protein_target, 87);
  assertEquals(dinner.protein_target, 63);
});
