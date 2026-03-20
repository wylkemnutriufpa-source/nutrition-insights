/**
 * Unified Nutrition Search Engine
 * Searches: meal_library, recipes, nutrition_plan_templates, caloric_templates
 * Returns grouped results with badges
 */
import { supabase } from "@/integrations/supabase/client";

export interface NutritionSearchResult {
  id: string;
  entity_type: "recipe" | "meal_library" | "meal_plan_template" | "caloric_template";
  title: string;
  keywords: string;
  clinical_tags: string;
  goal_tags: string;
  strategy_tags: string;
  extra_data: Record<string, any>;
}

export interface GroupedSearchResults {
  recipes: NutritionSearchResult[];
  meals: NutritionSearchResult[];
  plans: NutritionSearchResult[];
  strategies: NutritionSearchResult[];
  calories: NutritionSearchResult[];
}

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export async function searchNutrition(query: string): Promise<GroupedSearchResults> {
  const empty: GroupedSearchResults = { recipes: [], meals: [], plans: [], strategies: [], calories: [] };
  if (!query || query.trim().length < 2) return empty;

  const normalized = normalize(query.trim());
  const words = normalized.split(/\s+/).filter(Boolean);

  // Search the index
  const { data } = await supabase
    .from("nutrition_search_index" as any)
    .select("*")
    .limit(50);

  if (!data || data.length === 0) {
    // Fallback: search directly from tables
    return searchDirectly(words);
  }

  const matched = (data as any[]).filter((item: any) => {
    const haystack = normalize(
      `${item.title} ${item.keywords} ${item.clinical_tags} ${item.goal_tags} ${item.strategy_tags}`
    );
    return words.every(w => haystack.includes(w));
  });

  return groupResults(matched);
}

async function searchDirectly(words: string[]): Promise<GroupedSearchResults> {
  const results: GroupedSearchResults = { recipes: [], meals: [], plans: [], strategies: [], calories: [] };

  const [recipesRes, mealsRes] = await Promise.all([
    supabase.from("recipes").select("id, title, category, tags, calories_per_serving, protein_per_serving").limit(30),
    supabase.from("meal_library" as any).select("id, title, meal_type, goal_tag, clinical_tags, base_calories, protein").eq("is_active", true).limit(50),
  ]);

  if (recipesRes.data) {
    results.recipes = (recipesRes.data as any[])
      .filter(r => {
        const h = normalize(`${r.title} ${r.category || ''} ${JSON.stringify(r.tags || [])}`);
        return words.every(w => h.includes(w));
      })
      .map(r => ({
        id: r.id,
        entity_type: "recipe" as const,
        title: r.title,
        keywords: r.category || '',
        clinical_tags: JSON.stringify(r.tags || []),
        goal_tags: r.category || '',
        strategy_tags: '',
        extra_data: { calories: r.calories_per_serving, protein: r.protein_per_serving },
      }));
  }

  if (mealsRes.data) {
    results.meals = (mealsRes.data as any[])
      .filter(r => {
        const h = normalize(`${r.title} ${r.meal_type || ''} ${r.goal_tag || ''} ${JSON.stringify(r.clinical_tags || [])}`);
        return words.every(w => h.includes(w));
      })
      .map(r => ({
        id: r.id,
        entity_type: "meal_library" as const,
        title: r.title,
        keywords: r.meal_type || '',
        clinical_tags: JSON.stringify(r.clinical_tags || []),
        goal_tags: r.goal_tag || '',
        strategy_tags: '',
        extra_data: { calories: r.base_calories, protein: r.protein },
      }));
  }

  return results;
}

function groupResults(items: any[]): GroupedSearchResults {
  const results: GroupedSearchResults = { recipes: [], meals: [], plans: [], strategies: [], calories: [] };

  for (const item of items) {
    const mapped: NutritionSearchResult = {
      id: item.entity_id || item.id,
      entity_type: item.entity_type,
      title: item.title,
      keywords: item.keywords || '',
      clinical_tags: item.clinical_tags || '',
      goal_tags: item.goal_tags || '',
      strategy_tags: item.strategy_tags || '',
      extra_data: item.extra_data || {},
    };

    switch (item.entity_type) {
      case 'recipe': results.recipes.push(mapped); break;
      case 'meal_library': results.meals.push(mapped); break;
      case 'meal_plan_template': results.plans.push(mapped); break;
      case 'caloric_template': results.calories.push(mapped); break;
      default: results.strategies.push(mapped);
    }
  }

  return results;
}

export const SEARCH_SUGGESTIONS = [
  "Tente buscar por objetivo clínico (ex: emagrecimento)",
  "Tente buscar por alimento principal (ex: frango)",
  "Tente buscar por estratégia nutricional (ex: low carb)",
  "Tente buscar por calorias (ex: 1500)",
];
