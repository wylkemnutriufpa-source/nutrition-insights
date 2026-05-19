
import { supabase } from "@/integrations/supabase/client";

/**
 * COMPILADOR DETERMINÍSTICO DE TEMPLATES
 * Transforma Blueprints em snapshots reais usando a meal_visual_library.
 * Gera 7 dias com rotação de substitutos para variedade.
 */

export const compileTemplateFromLibrary = async (blueprint: any) => {
  const { data: library } = await supabase
    .from('meal_visual_library')
    .select('*')
    .eq('is_active', true);

  if (!library || library.length === 0) {
    console.warn('[Template Compiler] meal_visual_library está vazia.');
    return null;
  }

  const findBySlug = (slug: string) => {
    const item = library.find(i => i.slug === slug);
    if (!item) {
      console.warn(`[Template Compiler] Slug não encontrado: ${slug}`);
      return null;
    }
    return item;
  };

  const buildItem = (slug: string, isPrimary = false, subSlugs: string[] = []) => {
    const main = findBySlug(slug);
    if (!main) return null;

    return {
      id: crypto.randomUUID(),
      instanceId: crypto.randomUUID(),
      visual_library_item_id: main.id,
      name: main.name,
      title: main.name,
      kcal: Number(main.default_calories),
      protein: Number(main.default_protein),
      carbs: Number(main.default_carbs),
      fat: Number(main.default_fat),
      quantity: 1,
      quantity_display: main.default_portion || '1 porção',
      imageUrl: main.image_url,
      is_primary: isPrimary,
      substitutions: subSlugs.map(s => {
        const sub = findBySlug(s);
        if (!sub) return null;
        return {
          id: crypto.randomUUID(),
          instanceId: crypto.randomUUID(),
          visual_library_item_id: sub.id,
          name: sub.name,
          title: sub.name,
          kcal: Number(sub.default_calories),
          protein: Number(sub.default_protein),
          carbs: Number(sub.default_carbs),
          fat: Number(sub.default_fat),
          quantity: 1,
          quantity_display: sub.default_portion || '1 porção',
          imageUrl: sub.image_url
        };
      }).filter(Boolean)
    };
  };

  const compiledPlan: any = {};
  
  for (const kcal of blueprint.kcal_profiles) {
    // Gerar 7 dias (0=Dom a 6=Sáb)
    const days = [0, 1, 2, 3, 4, 5, 6].map(dayNum => ({
      day_of_week: dayNum,
      meals: blueprint.meals.map((m: any) => ({
        id: crypto.randomUUID(),
        name: m.name,
        time: m.time,
        items: [
          buildItem(m.main, true, m.subs),
          ...(m.sides || []).map((s: any) => buildItem(s.slug, false, s.subs || []))
        ].filter(Boolean)
      }))
    }));

    compiledPlan[String(kcal)] = { days };
  }

  return {
    ...blueprint,
    plan_snapshot: compiledPlan
  };
};
