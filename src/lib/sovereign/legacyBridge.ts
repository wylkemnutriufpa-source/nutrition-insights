/**
 * 🌉 PONTE TEMPORÁRIA — Sovereign → Legacy MealPlanItem
 *
 * ⚠️ ESTE ARQUIVO É TEMPORÁRIO. Será DELETADO na FASE 2 (Consolidação).
 *
 * Por que existe?
 * - Componentes legados (MealGroup, MealSlotCard, MealDetailModal) usam o tipo
 *   `MealPlanItem` com macros ESPALHADOS (meta_calorias, meta_proteinas, ...).
 * - Refatorar todos esses componentes em um único commit quebraria o produto.
 * - Esta função-ponte permite que loaders Patient já consumam `useSovereignPlan`
 *   enquanto os componentes internos não são atualizados.
 *
 * REGRAS:
 * ✅ Esta função apenas REMAPEIA NOMES — não calcula, não infere.
 * ❌ NUNCA adicionar lógica aqui. Se precisar de lógica, está no lugar errado.
 *
 * FASE 2 vai:
 * 1. Refatorar MealCard/MealGroup/MealSlotCard para receber SovereignMealItem
 * 2. Deletar este arquivo
 * 3. Marcar tudo como soberano de ponta a ponta
 */

import type { SovereignMealItem } from './SovereignMealItem';

/** @deprecated Use SovereignMealItem após FASE 2 */
export interface LegacyMealPlanItem {
  id: string;
  title: string;
  description: string | null;
  tipo_refeicao: string;
  day_of_week: number;
  meta_calorias: number;
  meta_proteinas: number;
  meta_carboidratos: number;
  meta_gorduras: number;
  metadata?: Record<string, any> | null;
  image_url?: string | null;
  imageUrl?: string | null;
  is_primary: boolean;
  display_quantity?: string;
  clinical_mass_g?: number | null;
}

/**
 * 🌉 Converte SovereignMealItem → LegacyMealPlanItem.
 * Apenas remapeia nomes. Nenhuma lógica.
 */
export function toLegacyShape(item: SovereignMealItem): LegacyMealPlanItem {
  return {
    id: item.id,
    title: item.title,
    description: item.quantity_display || null,
    tipo_refeicao: item.meal.name,
    day_of_week: item.meal.day_of_week,
    meta_calorias: item.macros.kcal,
    meta_proteinas: item.macros.protein_g,
    meta_carboidratos: item.macros.carbs_g,
    meta_gorduras: item.macros.fat_g,
    image_url: item.imageUrl,
    imageUrl: item.imageUrl,
    is_primary: true,
    display_quantity: item.quantity_display,
    clinical_mass_g: item.clinical_mass_g,
    metadata: {
      image_url: item.imageUrl,
      meal_id: item.meal.id,
      meal_name: item.meal.name,
      meal_time: item.meal.time,
      meal_image_url: item.meal.imageUrl,
      substitution_count: item.substitutions.length,
      substitution_options: item.substitutions.map(s => ({
        id: s.id,
        title: s.title,
        meta_calorias: s.macros.kcal,
        meta_proteinas: s.macros.protein_g,
        meta_carboidratos: s.macros.carbs_g,
        meta_gorduras: s.macros.fat_g,
        image_url: s.imageUrl,
      })),
    },
  };
}
