
import { reconcileMeal, MealItem, MacroTargets, ClinicalProfile } from "../_shared/clinical-engine-v2.ts";

const items: MealItem[] = [
  { name: "Frango", grams: 100, macro_role: "protein", protein_per_100g: 30, carbs_per_100g: 0, fat_per_100g: 3, calories_per_100g: 150 },
  { name: "Arroz", grams: 100, macro_role: "carb", protein_per_100g: 2, carbs_per_100g: 28, fat_per_100g: 0, calories_per_100g: 130 },
  { name: "Azeite", grams: 5, macro_role: "fat", protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, calories_per_100g: 900 }
];

const targets: MacroTargets = {
  protein: 30,
  carbs: 50,
  fat: 15,
  calories: 455 // 30*4 + 50*4 + 15*9 = 120 + 200 + 135 = 455
};

const profile: ClinicalProfile = {
  sex: "female",
  weight: 60,
  height: 160,
  age: 30,
  activityLevel: "moderate",
  goal: "lose_weight"
};

console.log("--- TEST 1: PERFECT ALIGNMENT ---");
const result1 = reconcileMeal(items, targets, profile, "lunch");
console.log("Totals:", result1.totals);
console.log("Events:", result1.events.map(e => e.type));

console.log("\n--- TEST 2: ENERGY GAP (NEED MORE CALORIES) ---");
const targets2 = { ...targets, calories: 500 }; // Increase calories but keep macros the same
const result2 = reconcileMeal(items, targets2, profile, "lunch");
console.log("Totals:", result2.totals);
console.log("Events:", result2.events.filter(e => e.type === 'energy_reconciliation'));

console.log("\n--- TEST 3: PROTEIN CLAMP VS ENERGY ---");
const targets3 = { ...targets, protein: 200, calories: 1000 }; // Extreme protein target for female
const result3 = reconcileMeal(items, targets3, profile, "lunch");
console.log("Totals:", result3.totals);
console.log("Events:", result3.events.map(e => e.type));
console.log("Chicken Grams:", result3.items.find(i => i.name === "Frango")?.grams);
