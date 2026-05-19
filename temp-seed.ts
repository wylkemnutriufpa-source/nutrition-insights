import { createClient } from "@supabase/supabase-js";
import { generatePremiumTemplates } from "./src/lib/seedV3Templates";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const seed = async () => {
  try {
    const templates = generatePremiumTemplates();
    const validSlugs = templates.map(t => t.slug);
    
    console.log(`Limpando templates antigos (não estão em: ${validSlugs.join(', ')})...`);
    
    const { error: deleteError } = await supabase
      .from('v3_diet_templates')
      .delete()
      .is('nutritionist_id', null)
      .not('slug', 'in', `(${validSlugs.join(',')})`);

    if (deleteError) console.error("Erro ao deletar:", deleteError);

    for (const t of templates) {
      console.log(`Injetando: ${t.title}...`);
      const { error } = await supabase.from('v3_diet_templates').upsert({
        ...t,
        updated_at: new Date().toISOString()
      }, { onConflict: 'slug' });
      if (error) console.error('Erro ao inserir:', t.title, error);
    }
    console.log("✅ Concluído!");
  } catch (err) {
    console.error("Erro fatal:", err);
  }
};

seed();
