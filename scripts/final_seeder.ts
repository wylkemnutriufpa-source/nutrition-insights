import { createClient } from '@supabase/supabase-client-native';
import fs from 'fs';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const sql = fs.readFileSync('generated_templates.sql', 'utf8');
  const lines = sql.split('\n').filter(l => l.trim().startsWith('INSERT INTO'));
  
  console.log(`Found ${lines.length} insert statements.`);
  
  // Clear existing
  await supabase.from('v3_diet_templates').delete().is('nutritionist_id', null);

  for (const line of lines) {
    // Extract JSON parts from the INSERT statement
    // This is brittle, let's just parse the templates from the generation script instead.
  }
}
