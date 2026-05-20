
import { generateClinicalLibrary } from "./clinicalDataEngine";
import { supabase } from "@/integrations/supabase/client";

export const seedPremiumV3Templates = async () => {
  try {
    const templates = generateClinicalLibrary();
    console.log(`[Seeder] Seedando ${templates.length} templates Premium V3...`);
    
    for (const t of templates) {
      const { error } = await supabase.from('v3_diet_templates').upsert(t, { onConflict: 'slug' });
      if (error) console.error(`[Seeder] ERRO em ${t.title}:`, error);
    }
    return true;
  } catch (err) {
    console.error('[Seeder] ERRO FATAL:', err);
    return false;
  }
};
