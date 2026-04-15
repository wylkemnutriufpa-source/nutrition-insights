import { describe, expect, it } from "vitest";
import { generateTemplateVariation } from "../../../supabase/functions/_shared/template-variation-engine";

describe("template variation engine hardening", () => {
  it("não injeta item de café da manhã em almoço", () => {
    const template = {
      id: "tpl-1",
      name: "Carne + Macarrão Integral",
      meal_type: "lunch",
      kcal_base: 415,
      protein_base: 31,
      carbs_base: 34,
      fat_base: 19,
      foods_structure: [
        { name: "Carne moída magra", portion_grams: 130, calories: 230, protein: 26, carbs: 0, fat: 14 },
        { name: "Macarrão integral", portion_grams: 100, calories: 140, protein: 5, carbs: 28, fat: 1 },
        { name: "Azeite", portion_grams: 5, calories: 45, protein: 0, carbs: 0, fat: 5 },
      ],
      satiety_score: 5,
      complexity_level: "moderate",
      goal_tags: [],
      nutritionist_id: "nutri-1",
      is_global: true,
    };

    const dbFoods = [
      {
        id: "1",
        food_name: "Mingau de Aveia",
        normalized_name: "mingau de aveia",
        category: "cafe_da_manha",
        portion_grams: 125,
        calories: 200,
        protein: 7,
        carbs: 35,
        fats: 4,
        meal_tags_json: ["cafe_da_manha"],
        restriction_tags_json: [],
      },
      {
        id: "2",
        food_name: "Óleo de Coco",
        normalized_name: "oleo de coco",
        category: "gordura",
        portion_grams: 10,
        calories: 90,
        protein: 0,
        carbs: 0,
        fats: 10,
        meal_tags_json: [],
        restriction_tags_json: [],
      },
      {
        id: "3",
        food_name: "Arroz integral",
        normalized_name: "arroz integral",
        category: "carboidrato",
        portion_grams: 100,
        calories: 124,
        protein: 2.6,
        carbs: 25,
        fats: 1,
        meal_tags_json: ["almoco", "jantar"],
        restriction_tags_json: [],
      },
    ];

    const varied = generateTemplateVariation(template as any, dbFoods as any, {
      restrictions: [],
      dislikedFoods: [],
      allergies: [],
      seed: 1,
      mealType: "lunch",
    });

    const names = varied.foods_structure.map((food) => food.name.toLowerCase());
    expect(names).not.toContain("mingau de aveia");
    expect(names).not.toContain("óleo de coco");
  });
});