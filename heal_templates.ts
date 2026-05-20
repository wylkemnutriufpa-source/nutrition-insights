
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const FALLBACK_IMAGE = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/fruta.jpg';

async function healTemplates() {
  console.log('--- INICIANDO CONGELAMENTO E CURA DOS TEMPLATES SOBERANOS ---');

  // 1. Carregar Biblioteca Visual
  const { data: visualLibrary } = await supabase
    .from('meal_visual_library')
    .select('name, display_name, image_url')
    .eq('is_active', true);

  const findImage = (name: string) => {
    if (!name) return FALLBACK_IMAGE;
    const lowerName = name.toLowerCase().trim();
    const match = visualLibrary?.find(v => 
      v.name?.toLowerCase().trim() === lowerName || 
      v.display_name?.toLowerCase().trim() === lowerName
    );
    return match?.image_url || FALLBACK_IMAGE;
  };

  // 2. Buscar Templates
  const { data: templates, error } = await supabase
    .from('v3_diet_templates')
    .select('*');

  if (error) {
    console.error('Erro ao buscar templates:', error);
    return;
  }

  for (const template of templates) {
    console.log(`Processando: ${template.title}...`);
    const newSnapshot = JSON.parse(JSON.stringify(template.plan_snapshot || {}));

    for (const profileKey in newSnapshot) {
      const profile = newSnapshot[profileKey];
      if (profile.days) {
        profile.days = profile.days.map((day: any) => ({
          ...day,
          meals: (day.meals || []).map((meal: any) => ({
            ...meal,
            items: (meal.items || []).map((item: any) => {
              const healed = { ...item };
              
              // Padronização de campos
              healed.imageUrl = healed.imageUrl || healed.image_url || findImage(healed.name);
              healed.clinical_mass_g = healed.clinical_mass_g || healed.amount || 100;
              healed.quantity_display = healed.quantity_display || `${healed.clinical_mass_g}g`;
              
              // Macros obrigatórios
              healed.kcal = healed.kcal || 0;
              healed.protein = healed.protein || 0;
              healed.carbs = healed.carbs || 0;
              healed.fat = healed.fat || 0;

              // Substituições
              if (healed.substitutions) {
                healed.substitutions = healed.substitutions.map((sub: any) => ({
                  ...sub,
                  imageUrl: sub.imageUrl || sub.image_url || findImage(sub.name),
                  clinical_mass_g: sub.clinical_mass_g || sub.amount || healed.clinical_mass_g,
                  quantity_display: sub.quantity_display || `${sub.clinical_mass_g || healed.clinical_mass_g}g`
                }));
              }

              // Remover campos legados/redundantes para congelar o snapshot
              delete healed.image_url;
              delete healed.amount;

              return healed;
            })
          }))
        }));
      }
    }

    // 3. Persistir Snapshot Curado e Congelado
    const { error: updateError } = await supabase
      .from('v3_diet_templates')
      .update({ 
        plan_snapshot: newSnapshot,
        sovereign_validated: true 
      })
      .eq('id', template.id);

    if (updateError) {
      console.error(`Erro ao atualizar ${template.title}:`, updateError);
    } else {
      console.log(`✅ ${template.title} CONGELADO E VALIDADO.`);
    }
  }

  console.log('--- CURA CONCLUÍDA ---');
}

healTemplates();
