import { supabase } from "../src/integrations/supabase/client";
import fs from 'fs';

async function apply() {
  const sql = fs.readFileSync('generated_templates.sql', 'utf8');
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  
  for (const statement of statements) {
    console.log('Executing statement starting with:', statement.substring(0, 50));
    const { error } = await (supabase as any).rpc('exec_sql', { sql_query: statement });
    if (error) {
      console.error('Error executing statement:', error);
      // Fallback: try raw query if RPC fails
      const { error: error2 } = await supabase.from('v3_diet_templates').insert(JSON.parse(statement.split('VALUES')[1].split(');')[0].trim()));
      // This fallback is complex, better to use the rpc if available.
    }
  }
}
// apply();
