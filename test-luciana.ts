
import { NutriCoreV3Adapter } from "./src/lib/nutricore_v2/adapter";
import { BASE_FOODS } from "./src/lib/nutricore_v2/food-database";

const lucianaContext = {
  id: "29a22b11-dfab-41b2-8468-8b540dec8876",
  name: "Luciana Figueiredo",
  weight: 79.9,
  height: 174,
  age: 30,
  gender: "female" as const,
  goal: "maintain",
  activityLevel: "moderate",
  restrictions: [],
  preferences: []
};

async function test() {
  console.log("Starting Proof of Runtime for Luciana...");
  
  // Transform BASE_FOODS to V3Food format
  const v3Foods = BASE_FOODS.map(f => ({
    id: f.id,
    name: f.name,
    category: f.category,
    protein: f.protein_100g,
    carbs: f.carb_100g,
    fat: f.fat_100g,
    kcal: f.kcal_100g,
    portionUnitLabel: 'g'
  }));

  const plan = await NutriCoreV3Adapter.generateElitePlan(lucianaContext as any, v3Foods as any);
  
  console.log("\n=== CALL GRAPH REAL: NutriCoreV3 (LUCINA FIGUEIREDO) ===\n");
  
  plan.forEach(meal => {
    console.log(`\nRefeição: ${meal.name} (${meal.time})`);
    console.log(`--------------------------------------------------`);
    
    let mealP = 0, mealK = 0, mealC = 0, mealF = 0;
    
    meal.items.forEach(item => {
      console.log(`Item: ${item.name}`);
      console.log(`  - clinical_mass_g: ${item.clinical_mass_g}g`);
      console.log(`  - display_quantity: ${item.quantity} ${item.portionLabel}`);
      console.log(`  - measurementType: ${item.measurementType}`);
      console.log(`  - protein final: ${item.protein}g`);
      console.log(`  - kcal final: ${item.kcal} kcal`);
      
      mealP += item.protein;
      mealK += item.kcal;
      mealC += item.carbs;
      mealF += item.fat;
    });
    
    console.log(`\nTOTAL REFEIÇÃO:`);
    console.log(`  - Protein: ${mealP.toFixed(1)}g`);
    console.log(`  - Kcal: ${mealK.toFixed(1)} kcal`);
  });

  const totalP = plan.reduce((acc, m) => acc + m.items.reduce((s, i) => s + i.protein, 0), 0);
  const totalK = plan.reduce((acc, m) => acc + m.items.reduce((s, i) => s + i.kcal, 0), 0);
  
  console.log("\n==================================================");
  console.log(`TOTAL DIÁRIO FINAL: ${totalK.toFixed(0)} kcal | ${totalP.toFixed(1)}g PROTEÍNA`);
  console.log("==================================================\n");
}

test().catch(console.error);
