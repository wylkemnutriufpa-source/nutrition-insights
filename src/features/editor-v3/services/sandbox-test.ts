
import { V3SandboxGenerator } from "./v3SandboxGenerator";

async function runTest() {
  console.log("--- STARTING V3 SANDBOX TEST ---");
  
  try {
    const draft = await V3SandboxGenerator.generateDraft({
      patientContext: {
        goal: 'hipertrofia',
        weight: 80,
        calories_target: 2800,
        protein_target: 180
      }
    });

    console.log(`Generated ${draft.length} meals.`);
    
    draft.forEach(meal => {
      console.log(`\nMeal: ${meal.name} (${meal.time})`);
      console.log(`Image: ${meal.imageUrl}`);
      
      const totalKcal = meal.items.reduce((sum, it) => sum + (it.kcal || 0), 0);
      const totalProtein = meal.items.reduce((sum, it) => sum + (it.protein || 0), 0);
      
      console.log(`Macros: ${Math.round(totalKcal)}kcal | ${totalProtein}g protein`);
      
      meal.items.forEach(item => {
        console.log(`  - ${item.name}: ${item.quantity}g (${item.kcal}kcal)`);
      });
    });

    console.log("\n--- TEST COMPLETE ---");
  } catch (err) {
    console.error("Test failed:", err);
  }
}

runTest();
