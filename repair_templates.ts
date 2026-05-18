
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Needs service role for updates
const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_IMAGE_URL = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/';

const IMAGE_MAP: Record<string, string> = {
  'Pão Integral': 'pao-integral.jpg',
  'Pão Francês': 'pao-frances.jpg',
  'Ovo Mexido': 'ovos-mexidos.jpg',
  'Arroz Branco': 'arroz-branco.jpg',
  'Feijão Carioca': 'feijao-carioca.jpg',
  'Frango Grelhado': 'frango-grelhado.jpg',
  'Iogurte com Frutas': 'iogurte-com-fruta/iogurte-com-fruta.jpg',
  'Sopa de Legumes': 'sopa-de-legumes.jpg',
  'Banana com Aveia': 'banana-com-aveia.jpg',
  'Whey Protein': 'whey-protein.jpg',
  'Carne Grelhada': 'carne-grelhada.jpg',
  'Tapioca': 'tapioca-com-queijo.jpg'
};

async function repairTemplates() {
  console.log("Starting template repair...");
  const { data: templates, error } = await supabase
    .from('v3_diet_templates')
    .select('*');

  if (error) {
    console.error("Error fetching templates:", error);
    return;
  }

  for (const template of templates) {
    console.log(`Repairing template: ${template.title}`);
    const snapshot = template.plan_snapshot || {};
    const kcalProfiles = Object.keys(snapshot);

    for (const kcal of kcalProfiles) {
      const data = snapshot[kcal];
      if (!data || !data.meals) continue;

      // Ensure 7 days
      const existingDays = new Set(data.meals.map((m: any) => m.day_of_week));
      const baseMeals = data.meals.filter((m: any) => m.day_of_week === 1 || m.day_of_week === Array.from(existingDays)[0]);
      
      const newMeals = [];
      for (let d = 0; d < 7; d++) {
        const dayNum = d === 0 ? 7 : d; // Sunday is 7 or 0 depending on convention, let's use 1-7
        const dayMeals = baseMeals.map((m: any) => ({
          ...m,
          day_of_week: dayNum,
          id: `m-${m.name}-${dayNum}-${Math.random().toString(36).substr(2, 5)}`,
          items: m.items.map((it: any) => {
            const img = IMAGE_MAP[it.name] ? `${BASE_IMAGE_URL}${IMAGE_MAP[it.name]}` : (it.imageUrl || `${BASE_IMAGE_URL}fruta.jpg`);
            
            // Add a default substitution if none exists
            const subs = it.substitutions || [];
            if (subs.length === 0 && it.name === 'Pão Integral') {
              subs.push({
                id: `sub-${Math.random().toString(36).substr(2, 5)}`,
                name: 'Tapioca',
                kcal: it.kcal,
                protein: 1,
                carbs: 34,
                fat: 0,
                clinical_mass_g: 50,
                imageUrl: `${BASE_IMAGE_URL}tapioca-com-queijo.jpg`
              });
            }

            return {
              ...it,
              imageUrl: img,
              substitutions: subs.map((s: any) => ({
                ...s,
                imageUrl: s.imageUrl || (IMAGE_MAP[s.name] ? `${BASE_IMAGE_URL}${IMAGE_MAP[s.name]}` : `${BASE_IMAGE_URL}fruta.jpg`)
              }))
            };
          })
        }));
        newMeals.push(...dayMeals);
      }
      snapshot[kcal].meals = newMeals;
    }

    const { error: updateError } = await supabase
      .from('v3_diet_templates')
      .update({ plan_snapshot: snapshot })
      .eq('id', template.id);

    if (updateError) {
      console.error(`Error updating template ${template.title}:`, updateError);
    } else {
      console.log(`Template ${template.title} repaired.`);
    }
  }
  console.log("Repair complete.");
}

repairTemplates();
