import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Parse .env
const envText = readFileSync('.env', 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^([^=]+)=["']?(.+?)["']?$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;

console.log('URL:', url);
console.log('Key prefix:', key?.substring(0, 20) + '...');

const supabase = createClient(url, key);

async function audit() {
  // 1. Fetch all v3 templates
  const { data: v3, error: v3Err } = await supabase
    .from('v3_diet_templates')
    .select('id, title, active, kcal_profiles, plan_snapshot, updated_at')
    .order('title');

  if (v3Err) {
    console.error('V3 error:', v3Err);
    return;
  }

  console.log(`\n=== ${v3?.length || 0} V3 TEMPLATES FOUND ===\n`);

  // 2. For each template, show structure
  for (const t of (v3 || [])) {
    const snap = t.plan_snapshot;
    const snapKeys = snap ? Object.keys(snap) : [];
    const snapSize = JSON.stringify(snap || {}).length;

    console.log(`--- ${t.title} ---`);
    console.log(`  ID: ${t.id}`);
    console.log(`  Active: ${t.active}`);
    console.log(`  Updated: ${t.updated_at}`);
    console.log(`  Kcal profiles: ${JSON.stringify(t.kcal_profiles)}`);
    console.log(`  Snapshot keys: ${JSON.stringify(snapKeys)}`);
    console.log(`  Snapshot size: ${snapSize} bytes`);

    // Show first profile's first day's meals
    if (snapKeys.length > 0) {
      const firstKey = snapKeys[0];
      const profile = snap[firstKey];
      const day0 = profile?.days?.[0];
      if (day0?.meals) {
        console.log(`  Profile "${firstKey}" Day 0 meals:`);
        for (const meal of day0.meals) {
          const itemNames = (meal.items || []).map(i => `${i.name || i.title} (${i.kcal || 0}kcal)`).join(', ');
          console.log(`    ${meal.name}: ${itemNames || '(EMPTY)'}`);
        }
      } else {
        console.log(`  Profile "${firstKey}": NO days/meals found`);
      }
    } else {
      console.log(`  NO SNAPSHOT DATA`);
    }
    console.log('');
  }

  // 3. Also check v2 templates
  const { data: v2, error: v2Err } = await supabase
    .from('diet_templates')
    .select('id, name, is_active')
    .eq('is_active', true)
    .order('name');

  console.log(`\n=== ${v2?.length || 0} V2 (LEGACY) TEMPLATES ===`);
  for (const t of (v2 || [])) {
    console.log(`  ${t.name} (${t.id})`);
  }
}

audit().catch(console.error);
