
import { generateClinicalLibrary } from "./clinicalDataEngine";
import { supabase } from "@/integrations/supabase/client";

const ORPHAN_SLUGS = [
  'anti-inflamatorio-premium-v3',
  'pre-pos-op-premium-v3',
  'cetogenica-premium-v3',
  'colesterol-premium-v3',
  'fodmap-premium-v3',
  'pratico-premium-v3',
  'diabetes-premium-v3',
  'gestantes-premium-v3',
  'bariatrica-premium-v3',
  'emagrecimento-premium-v3',
  'hipertrofia-premium-v3',
  'low-carb-premium-v3',
  'massa-limpa-premium-v3',
  'detox-premium-v3',
];

export const seedPremiumV3Templates = async () => {
  try {
    // 1. Limpar duplicatas órfãs
    console.log(`[Seeder] Removendo ${ORPHAN_SLUGS.length} duplicatas -premium-v3...`);
    const { error: delErr } = await supabase
      .from('v3_diet_templates')
      .delete()
      .in('slug', ORPHAN_SLUGS);
    if (delErr) console.warn('[Seeder] Aviso ao limpar duplicatas:', delErr);
    else console.log('[Seeder] Duplicatas removidas com sucesso.');

    // 2. Upsert dos templates canônicos
    const templates = generateClinicalLibrary();
    console.log(`[Seeder] Seedando ${templates.length} templates canônicos...`);
    
    for (const t of templates) {
      const { error } = await supabase.from('v3_diet_templates').upsert(t, { onConflict: 'slug' });
      if (error) console.error(`[Seeder] ERRO em ${t.title}:`, error);
      else console.log(`[Seeder] ✅ ${t.title} (${t.slug})`);
    }
    return true;
  } catch (err) {
    console.error('[Seeder] ERRO FATAL:', err);
    return false;
  }
};
