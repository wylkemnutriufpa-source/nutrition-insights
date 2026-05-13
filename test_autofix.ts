import { autoFixMealPlan } from './src/lib/autoFixEngine';

async function testAutoFixPassivity() {
  const planId = '5954323f-c9ea-489c-8e03-e95f53eb5200';
  const patientId = '59da7398-dc14-4faf-bf8d-9dfc23055709';
  const nutritionistId = '67f47696-a778-4ada-9ff9-9615fb7a7c48';
  const tenantId = '20081963-8db9-4a6c-8181-6a820b86e12f';

  console.log("🛠️ Starting AutoFix Passivity Test...");
  const result = await autoFixMealPlan(planId, patientId, nutritionistId, tenantId);
  console.log("AutoFix Result Success:", result.success);
}

testAutoFixPassivity().catch(console.error);
