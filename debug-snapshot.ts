
import { buildMealPlanSnapshot } from './src/lib/snapshot/buildSnapshot';
import { MealPlanSnapshotV1Schema } from './src/lib/snapshot/zodSchema';

async function debug() {
  const planId = '0754c5f4-683b-4ed4-bd89-f4a190df7172';
  try {
    const snapshot = await buildMealPlanSnapshot(planId);
    console.log('Snapshot built successfully');
    const result = MealPlanSnapshotV1Schema.safeParse(snapshot);
    if (!result.success) {
      console.error('Validation failed:', JSON.stringify(result.error.issues, null, 2));
    } else {
      console.log('Validation success!');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

debug();
