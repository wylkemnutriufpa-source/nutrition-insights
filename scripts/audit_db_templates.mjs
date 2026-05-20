import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env manually to avoid extra dependencies
const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("Supabase URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data, error } = await supabase.from('v3_diet_templates').select('id, slug, title, plan_snapshot');
    if (error) {
      console.error("Error fetching templates:", error);
      return;
    }
    console.log(`Found ${data.length} templates:`);
    data.forEach(t => {
      const size = t.plan_snapshot ? JSON.stringify(t.plan_snapshot).length : 0;
      console.log(`- ${t.title} (slug: ${t.slug}, id: ${t.id}) - Snapshot Size: ${size} bytes`);
    });
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

run();
