
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { generateWeeklyMarmitaPlan, type MarmitaRecipe } from "./index.ts";

Deno.test("weekly_marmita integration: full contract validation", async () => {
  // 1. Setup Mock Data with variety
  const recipes: MarmitaRecipe[] = [
    { 
      id: "r1", name: "Frango com Batata Doce", meal_type: "almoço", 
      foods_json: [{ name: "Frango", grams: 150 }, { name: "Batata Doce", grams: 150 }],
      is_scalable: true,
      created_at: new Date().toISOString()
    },
    { 
      id: "r2", name: "Patinho com Arroz", meal_type: "almoço", 
      foods_json: [{ name: "Patinho", grams: 150 }, { name: "Arroz", grams: 150 }],
      is_scalable: true,
      created_at: new Date().toISOString()
    },
    { 
      id: "r3", name: "Peixe com Legumes", meal_type: "jantar", 
      foods_json: [{ name: "Tilápia", grams: 150 }, { name: "Brócolis", grams: 100 }],
      is_scalable: true,
      created_at: new Date().toISOString()
    },
    { 
      id: "r4", name: "Omelete de Forno", meal_type: "jantar", 
      foods_json: [{ name: "Ovo", grams: 120 }, { name: "Queijo", grams: 30 }],
      is_scalable: false, // Fixed grammage (Modo Paciente)
      created_at: new Date().toISOString()
    }
  ];

  const kcalTarget = 2000;
  const macros = { protein: 160, carbs: 200, fat: 60 };

  // 2. Generate Plan for Week 1 (Updated with new signature)
  const result = await generateWeeklyMarmitaPlan(
    {} as any, // serviceClient mock
    recipes, [], [], "manutencao", kcalTarget, macros, [], [], [], ["lunch", "dinner"],
    undefined, undefined, undefined, undefined, false
  );

  // 3. Validate JSON structure & Length
  assertEquals(result.items.length, 14, "Should generate 14 items (7 days * 2 meals)");
  
  result.items.forEach((item: any) => {
    assertEquals(item._source, "meal_recipe");
  });

  // 4. Validate Variety Validation: At least some variety should be present if logic allows
  const proteins = new Set(result.items.map((i: any) => i._recipe_name));
  assertEquals(proteins.size >= 2, true, `Should have variety, found: ${Array.from(proteins)}`);
});
