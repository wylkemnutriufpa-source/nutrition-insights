import { supabase } from "@/integrations/supabase/client";
import { Food, MealTemplate, V3DietTemplate } from "../types/types";
import { DietTemplateService } from "../services/dietTemplateService";

export const searchV3LibraryItems = async (
  query: string,
  category?: string,
  mealSlot?: string,
  useLegacyLibrary = true
): Promise<any[]> => {
  let queryBuilder = supabase
    .from("v3_library_items")
    .select("*, images:v3_library_images(*)")
    .eq("active", true);

  if (category && category !== 'all') {
    queryBuilder = queryBuilder.eq("category", category);
  }

  // If no specific query but mealSlot provided, suggest items for that slot
  if (!query && mealSlot) {
    const normSlot = mealSlot.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const categoryMap: Record<string, string[]> = {
      "cafe": ["Café da Manhã"],
      "almoco": ["Almoço", "Jantar"],
      "jantar": ["Jantar", "Almoço"],
      "lanche": ["Lanche da Manhã", "Lanche da Tarde", "Pós-Treino", "Pré-Treino"],
      "ceia": ["Ceia", "Lanche da Tarde"]
    };

    let slotsToSearch: string[] = [];
    if (normSlot.includes("cafe")) slotsToSearch = categoryMap.cafe;
    else if (normSlot.includes("almoco")) slotsToSearch = categoryMap.almoco;
    else if (normSlot.includes("jantar")) slotsToSearch = categoryMap.jantar;
    else if (normSlot.includes("lanche")) slotsToSearch = categoryMap.lanche;
    else if (normSlot.includes("ceia")) slotsToSearch = categoryMap.ceia;
    else slotsToSearch = [mealSlot];

    queryBuilder = queryBuilder.overlaps("tipo_refeicao", slotsToSearch);
  }

  if (query && query.length >= 2) {
    queryBuilder = queryBuilder.or(`title.ilike.%${query}%,slug.ilike.%${query}%,category.ilike.%${query}%`);
  }

  const { data: v3Data, error: v3Error } = await queryBuilder.limit(40);

  if (v3Error) {
    console.error("Error searching V3 Library:", v3Error);
  }

  // 🛡️ INTEGRAÇÃO PREMIUM: Buscar também no banco de refeições do nutricionista e bases legadas
  let legacyData: any[] = [];
  if (useLegacyLibrary && (query.length >= 2 || !query)) {
    try {
      const [{ data: foodData }, { data: mealData }, { data: nutryMealData }] = await Promise.all([
        supabase.from("food_database")
          .select("*")
          .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
          .limit(30),
        supabase.from("meal_visual_library")
          .select("*")
          .or(`name.ilike.%${query}%,slug.ilike.%${query}%`)
          .limit(20),
        supabase.from("nutritionist_meal_templates")
          .select("*")
          .or(`name.ilike.%${query}%,tipo_refeicao.ilike.%${query}%`)
          .limit(20)
      ]);

      legacyData = [
        ...(foodData || []).map(f => ({ ...f, type: 'food' })),
        ...(mealData || []).map(m => ({ ...m, type: 'meal' })),
        ...(nutryMealData || []).map(n => ({ ...n, type: 'nutritionist_meal', title: n.name, kcal_base: n.kcal_base }))
      ];
    } catch (err) {
      console.warn("Extended search failed:", err);
    }
  }

  const combinedData = [...(v3Data || []), ...legacyData];

  // DEDUPLICAÇÃO FORTE: Remove duplicatas exatas e prioriza itens com imagens
  const seenIds = new Set<string>();
  const seenNames = new Map<string, any>();
  
  for (const item of combinedData) {
    const itemId = item.id || `${item.type}_${item.title || item.name}`;
    if (seenIds.has(itemId)) continue;
    seenIds.add(itemId);
    
    const normalizedName = (item.title || item.name || "").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .trim();
    
    if (!normalizedName) continue;
    
    const existing = seenNames.get(normalizedName);
    if (!existing) {
      seenNames.set(normalizedName, item);
    } else {
      // REGRA DE PRIORIDADE: Prefere itens com imagem, depois V3, depois legado
      const existingImg = existing.imageUrl || existing.image_url ||
        (existing.images?.length > 0 ? existing.images[0].image_asset || existing.images[0].image_url : null);
      const newImg = item.imageUrl || item.image_url ||
        (item.images?.length > 0 ? item.images[0].image_asset || item.images[0].image_url : null);
      
      const existingIsV3 = existing.type === undefined || existing.type === 'v3';
      const newIsV3 = item.type === undefined || item.type === 'v3';
      
      // 1. Prefere item com imagem
      if (!existingImg && newImg) {
        seenNames.set(normalizedName, item);
      }
      // 2. Se ambos têm imagem ou nenhum tem, prefere V3
      else if ((existingImg && newImg) || (!existingImg && !newImg)) {
        if (!existingIsV3 && newIsV3) {
          seenNames.set(normalizedName, item);
        }
      }
    }
  }
  const deduped = Array.from(seenNames.values());

  const items = deduped.map((item: any) => {
    // Resolve imagem com prioridade clara:
    // 1. v3_library_images (join direto, mais confiável)
    // 2. image_url / imageUrl do próprio item
    // 3. URL por slug (apenas para meal_visual_library, onde slug = nome do arquivo)
    let imageUrl: string | null = null;

    if (item.images && item.images.length > 0) {
      imageUrl = item.images[0].image_asset || item.images[0].image_url || null;
    }
    if (!imageUrl) {
      imageUrl = item.imageUrl || item.image_url || null;
    }
    if (!imageUrl && item.slug && item.type === 'meal') {
      // Só usa slug para itens da meal_visual_library onde o slug é o nome do arquivo
      imageUrl = `https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/${item.slug}.jpg`;
    }

    return {
      ...item,
      name: item.title || item.name || "Alimento",
      kcal: item.kcal_base || item.kcal_100g || item.kcal || item.calories || 0,
      protein: item.protein_base || item.protein_100g || item.protein || item.protein_g || 0,
      carbs: item.carbs_base || item.carb_100g || item.carbs || item.carbs_g || 0,
      fat: item.fats_base || item.fat_100g || item.fat || item.fat_g || 0,
      imageUrl
    };
  });
  
  // Parallel fetch for substitutes if items have groups
  const itemsWithEquivalents = await Promise.all(items.map(async (item: any) => {
    if (item.substitutions_group) {
      const { data: subs } = await supabase
        .from("v3_library_items")
        .select("*, images:v3_library_images(*)")
        .eq("substitutions_group", item.substitutions_group)
        .neq("id", item.id)
        .eq("active", true)
        .limit(12);

      const mappedSubs = (subs || []).map((s: any) => {
        // Resolve imagem do substituto com a mesma lógica do item principal
        let subImageUrl: string | null = null;
        if (s.images && s.images.length > 0) {
          subImageUrl = s.images[0].image_asset || s.images[0].image_url || null;
        }
        if (!subImageUrl) subImageUrl = s.imageUrl || s.image_url || null;

        return {
          ...s,
          name: s.title || s.name || "Substituto",
          imageUrl: subImageUrl,
          // Garante macros por 100g para cálculo correto de equivalência
          kcal: s.kcal_base || s.kcal_100g || s.kcal || 0,
          kcal_100g: s.kcal_100g || s.kcal_base || s.kcal || 0,
          protein: s.protein_base || s.protein_100g || s.protein || 0,
          protein_100g: s.protein_100g || s.protein_base || s.protein || 0,
          carbs: s.carbs_base || s.carb_100g || s.carbs || 0,
          carb_100g: s.carb_100g || s.carbs_base || s.carbs || 0,
          fat: s.fats_base || s.fat_100g || s.fat || 0,
          fat_100g: s.fat_100g || s.fats_base || s.fat || 0,
        };
      });

      return { ...item, substitutions: mappedSubs };
    }
    return { ...item, substitutions: [] };
  }));

  return itemsWithEquivalents;
};

export const getV3Templates = async (): Promise<V3DietTemplate[]> => {
  return await DietTemplateService.listTemplates();
};
