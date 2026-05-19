
import { supabase } from "@/integrations/supabase/client";
import { compileTemplateFromLibrary } from "./templateCompiler";
import { BLUEPRINTS } from "./templateBlueprints";

export const seedPremiumV3Templates = async () => {
  try {
    console.log('[Seeder] Iniciando compilação determinística de templates...');
    
    const compiledTemplates = [];
    for (const blueprint of BLUEPRINTS) {
      const compiled = await compileTemplateFromLibrary(blueprint);
      if (compiled) {
        compiledTemplates.push(compiled);
      }
    }

    if (compiledTemplates.length === 0) {
      console.error('[Seeder] Falha ao compilar templates. Verifique a meal_visual_library.');
      return false;
    }

    const validSlugs = compiledTemplates.map(t => t.slug);
    
    // Limpar apenas o que não é mais oficial
    await supabase
      .from('v3_diet_templates')
      .delete()
      .is('nutritionist_id', null)
      .not('slug', 'in', `(${validSlugs.map(s => `'${s}'`).join(',')})`);

    for (const t of compiledTemplates) {
      const { error } = await supabase.from('v3_diet_templates').upsert({
        slug: t.slug,
        title: t.title,
        description: t.description,
        template_type: t.template_type,
        objective: t.objective,
        visual_style: t.visual_style,
        kcal_profiles: t.kcal_profiles,
        plan_snapshot: t.plan_snapshot,
        meal_distribution: t.meals.map((m: any) => ({ slot: m.name, time: m.time })),
        cluster_map: {},
        sovereign_validated: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'slug' });
      
      if (error) console.error('Error inserting template:', t.title, error);
      else console.log(`[Seeder] Template compilado com sucesso: ${t.title}`);
    }

    return true;
  } catch (err) {
    console.error('Fatal error seeding templates:', err);
    return false;
  }
};

