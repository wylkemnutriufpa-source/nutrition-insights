
import { supabase } from "@/integrations/supabase/client";

async function seedLibraryV3() {
  console.log("--- SEEDING BIBLIOTECA V3 ---");

  // 1. Clusters
  const clusters = [
    { cluster_slug: 'cafe_tradicional', cluster_name: 'Café Tradicional', meal_type: ['breakfast'], objective: 'manutencao' },
    { cluster_slug: 'cafe_proteico', cluster_name: 'Café Proteico', meal_type: ['breakfast'], objective: 'hipertrofia' },
    { cluster_slug: 'almoco_tradicional', cluster_name: 'Almoço Tradicional', meal_type: ['lunch', 'dinner'], objective: 'manutencao' },
    { cluster_slug: 'almoco_elaborado', cluster_name: 'Almoço Elaborado', meal_type: ['lunch', 'dinner'], objective: 'hipertrofia' },
    { cluster_slug: 'lanche_pratico', cluster_name: 'Lanche Prático', meal_type: ['snack'], objective: 'emagrecimento' },
    { cluster_slug: 'lanche_leve', cluster_name: 'Lanche Leve', meal_type: ['snack', 'supper'], objective: 'emagrecimento' },
  ];

  for (const c of clusters) {
    await supabase.from('v3_clusters').upsert(c as any, { onConflict: 'cluster_slug' });
  }

  // 2. Items
  const items = [
    {
      slug: 'pao-com-ovo',
      title: 'Pão com Ovo',
      meal_type: ['breakfast'],
      category: 'Café da Manhã',
      objective_tags: ['manutencao', 'hipertrofia'],
      kcal_base: 320,
      protein_base: 18,
      carbs_base: 28,
      fats_base: 14,
      portion_mode: 'standard',
      composition: [
        { name: 'Pão Integral', base_grams: 50, kcal: 130, protein: 5, carbs: 24, fats: 2 },
        { name: 'Ovos Mexidos', base_grams: 100, kcal: 150, protein: 12, carbs: 1, fats: 10 },
        { name: 'Fruta', base_grams: 80, kcal: 40, protein: 1, carbs: 3, fats: 2 }
      ]
    },
    {
      slug: 'frango-com-arroz',
      title: 'Frango com Arroz e Feijão',
      meal_type: ['lunch', 'dinner'],
      category: 'Almoço/Jantar',
      objective_tags: ['manutencao', 'hipertrofia'],
      kcal_base: 550,
      protein_base: 40,
      carbs_base: 60,
      fats_base: 12,
      portion_mode: 'standard',
      composition: [
        { name: 'Arroz Branco', base_grams: 120, kcal: 156, protein: 3, carbs: 34, fats: 0 },
        { name: 'Feijão Carioca', base_grams: 80, kcal: 60, protein: 4, carbs: 11, fats: 0.5 },
        { name: 'Frango Grelhado', base_grams: 150, kcal: 247, protein: 32, carbs: 0, fats: 12 },
        { name: 'Salada Verde', base_grams: 100, kcal: 15, protein: 1, carbs: 3, fats: 0 }
      ]
    },
    {
      slug: 'iogurte-com-frutas',
      title: 'Iogurte com Frutas e Granola',
      meal_type: ['snack', 'supper'],
      category: 'Lanches',
      objective_tags: ['emagrecimento', 'manutencao'],
      kcal_base: 250,
      protein_base: 12,
      carbs_base: 35,
      fats_base: 6,
      portion_mode: 'standard',
      composition: [
        { name: 'Iogurte Natural', base_grams: 170, kcal: 100, protein: 7, carbs: 10, fats: 3 },
        { name: 'Mix de Frutas', base_grams: 120, kcal: 60, protein: 1, carbs: 15, fats: 0 },
        { name: 'Granola', base_grams: 30, kcal: 90, protein: 4, carbs: 10, fats: 3 }
      ]
    },
    {
      slug: 'omelete-de-queijo',
      title: 'Omelete de Queijo',
      meal_type: ['breakfast', 'supper'],
      category: 'Café/Ceia',
      objective_tags: ['manutencao', 'hipertrofia'],
      kcal_base: 280,
      protein_base: 22,
      carbs_base: 2,
      fats_base: 20,
      portion_mode: 'standard',
      composition: [
        { name: 'Ovos', base_grams: 100, kcal: 150, protein: 13, carbs: 1, fats: 10 },
        { name: 'Queijo Branco', base_grams: 30, kcal: 100, protein: 8, carbs: 1, fats: 8 },
        { name: 'Tomate e Ervas', base_grams: 50, kcal: 30, protein: 1, carbs: 0, fats: 2 }
      ]
    }
  ];

  for (const item of items) {
    const { data: inserted, error: upsertError } = await supabase.from('v3_library_items').upsert(item as any, { onConflict: 'slug' }).select('id').single();
    
    if (upsertError) {
      console.error(`Error upserting ${item.slug}:`, upsertError);
      continue;
    }

    if (inserted) {
      // Add fake image for testing
      await supabase.from('v3_library_images').upsert({
        item_slug: item.slug,
        image_asset: `https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/${item.slug}.jpg`,
        active: true
      } as any, { onConflict: ['item_slug', 'image_asset'] } as any);
    }
  }

  console.log("--- SEED COMPLETE ---");
}

seedLibraryV3();
