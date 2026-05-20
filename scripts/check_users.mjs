import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env manually
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
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log("Fetching profiles...");
    const { data: profiles, error: pError } = await supabase.from('profiles').select('id, user_id, full_name, tenant_id');
    if (pError) {
      console.error("Profiles error:", pError);
    } else {
      console.log(`Found ${profiles.length} profiles:`);
      profiles.forEach(p => console.log(`- Profile: ${p.full_name} | ID: ${p.id} | UserID: ${p.user_id} | TenantID: ${p.tenant_id}`));
    }

    console.log("\nFetching user_roles...");
    const { data: roles, error: rError } = await supabase.from('user_roles').select('id, user_id, role');
    if (rError) {
      console.error("Roles error:", rError);
    } else {
      console.log(`Found ${roles.length} user_roles entries:`);
      roles.forEach(r => console.log(`- Role: ${r.role} | UserID: ${r.user_id}`));
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

run();
