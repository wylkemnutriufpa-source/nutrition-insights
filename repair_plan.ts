
import { createClient } from '@supabase/supabase-js';
import { buildMealPlanSnapshot } from './src/lib/snapshot/buildSnapshot';
import { generateAndPersistMealPlanSnapshot } from './src/lib/snapshot/persistSnapshot';

// We need to mock the environment since we are running in Node/Bun
// but the code expects browser-like crypto and supabase client.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const planId = "c5b81568-8865-4008-bdb5-fc672eb6b58d";

async function run() {
  console.log(`Repairing plan ${planId}...`);
  try {
    const result = await generateAndPersistMealPlanSnapshot(planId);
    console.log("Result:", result);
  } catch (err) {
    console.error("Error repairing plan:", err);
  }
}

run();
