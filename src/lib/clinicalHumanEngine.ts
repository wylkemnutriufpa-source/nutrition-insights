/**
 * FitJourney — Clinical Human Rules Engine (CHRE)
 * ----------------------------------------------------------------
 * Motor soberano para validar a "humanidade" e coerência cultural 
 * das refeições, além da matemática nutricional.
 */

import { Meal, MealItem } from "@/types";
import { SubstitutionGroup, getFoodGroup } from "./substitutionGroups";
import { MealSlot, normalizeSlot } from "./mealTypeIntegrity";

export type ExperienceDomain = 'comfort' | 'functional' | 'social' | 'quick' | 'heavy';
export type SatietyContext = 'low' | 'medium' | 'high';

export interface FoodHumanMetadata {
  experience_domain: ExperienceDomain;
  meal_affinity: Record<MealSlot, number>; // 0 to 1
  cultural_context: string[];
  satiety_context: SatietyContext;
}

/**
 * Mapeamento de afinidade humana para grupos de alimentos.
 * Define o que "parece certo" para um humano em cada slot.
 */
const GROUP_HUMAN_AFFINITY: Record<SubstitutionGroup, Partial<Record<MealSlot, number>>> = {
  "cafe-classico": { breakfast: 1.0, afternoon_snack: 0.8 },
  "cafe-proteico": { breakfast: 1.0, morning_snack: 0.7 },
  "carbo-cereal": { breakfast: 1.0, afternoon_snack: 0.9, morning_snack: 0.5 },
  "proteina-leve": { breakfast: 0.9, morning_snack: 0.6, afternoon_snack: 0.6, dinner: 0.8, supper: 0.9 },
  "fruta-doce": { breakfast: 0.8, morning_snack: 1.0, afternoon_snack: 1.0, supper: 0.7 },
  "fruta-acida": { breakfast: 0.9, morning_snack: 1.0, afternoon_snack: 1.0, supper: 0.8 },
  "proteina-almoco": { lunch: 1.0, dinner: 0.9, breakfast: 0.0, supper: 0.2 },
  "proteina-peixe": { lunch: 1.0, dinner: 1.0, breakfast: 0.0 },
  "carbo-almoco": { lunch: 1.0, dinner: 0.8, breakfast: 0.0 },
  "carbo-tuberoso": { lunch: 1.0, dinner: 0.9, breakfast: 0.1 },
  "salada-base": { lunch: 1.0, dinner: 1.0, breakfast: 0.0 },
  "lanche-proteico": { afternoon_snack: 1.0, morning_snack: 0.8, breakfast: 0.4 },
  "lanche-leve": { afternoon_snack: 1.0, morning_snack: 0.9, supper: 0.6 },
  "ceia-leve": { supper: 1.0, evening_snack: 1.0, breakfast: 0.2 },
  "gordura-oleaginosa": { morning_snack: 0.9, afternoon_snack: 0.9, supper: 0.8, breakfast: 0.5 },
  "laticinio-proteico": { breakfast: 0.9, morning_snack: 0.8, afternoon_snack: 0.8, supper: 0.7 },
  "laticinio-leve": { breakfast: 0.9, morning_snack: 0.9, afternoon_snack: 0.9, supper: 1.0 },
};

export interface HumanScoreResult {
  score: number; // 0 to 100
  status: 'human' | 'robotic' | 'absurd';
  reasons: string[];
}

/**
 * Calcula o score de humanidade de uma refeição.
 */
export function calculateHumanMealScore(meal: Partial<Meal>, slotInput: string): HumanScoreResult {
  const slot = normalizeSlot(slotInput);
  if (!slot) return { score: 100, status: 'human', reasons: [] };

  let score = 100;
  const reasons: string[] = [];
  const items = meal.items || [];

  if (items.length === 0) return { score: 0, status: 'absurd', reasons: ['Refeição vazia'] };

  // 1. Validação de Afinidade de Grupo
  items.forEach(item => {
    const group = getFoodGroup(item.name);
    if (group) {
      const affinity = GROUP_HUMAN_AFFINITY[group]?.[slot] ?? 0.5;
      if (affinity === 0) {
        score -= 40;
        reasons.push(`Alimento inadequado para o horário: ${item.name}`);
      } else if (affinity < 0.5) {
        score -= 20;
        reasons.push(`Baixa afinidade cultural: ${item.name}`);
      }
    }
  });

  // 2. Validação de Volume (Human Limits)
  items.forEach(item => {
    // Alface/Vegetais > 200g é visualmente absurdo para um prato normal
    if (item.quantity > 250 && item.name.toLowerCase().includes('alface')) {
      score -= 30;
      reasons.push(`Volume excessivo de ${item.name} (${item.quantity}g)`);
    }
    // Proteína > 300g (exceto para atletas muito específicos)
    const isProtein = getFoodGroup(item.name)?.startsWith('proteina');
    if (isProtein && item.quantity > 300) {
      score -= 25;
      reasons.push(`Porção de proteína robótica (${item.quantity}g)`);
    }
  });

  // 3. Coerência de Combinação (Ex: Feijão + Iogurte)
  const hasLegume = items.some(i => i.name.toLowerCase().includes('feijão') || i.name.toLowerCase().includes('grao de bico'));
  const hasDairy = items.some(i => i.name.toLowerCase().includes('iogurte') || i.name.toLowerCase().includes('leite'));
  if (hasLegume && hasDairy) {
    score -= 40;
    reasons.push('Combinação improvável: Leguminosa + Laticínio');
  }

  // 4. Determinação do Status
  let status: HumanScoreResult['status'] = 'human';
  if (score < 40) status = 'absurd';
  else if (score < 75) status = 'robotic';

  return { score: Math.max(0, score), status, reasons };
}

/**
 * Weekly Fatigue Guard
 * Impede repetição excessiva de itens ou estruturas.
 */
export class WeeklyFatigueGuard {
  private history: Record<string, number> = {}; // item_name -> count
  private dominantProteins: Record<string, number> = {}; // group -> count

  constructor() {}

  checkFatigue(meal: Meal): { canAdd: boolean; reason?: string } {
    for (const item of meal.items) {
      const group = getFoodGroup(item.name);
      
      // Regra: Não repetir proteína dominante > 3x na semana
      if (group?.startsWith('proteina')) {
        const count = this.dominantProteins[group] || 0;
        if (count >= 3) {
          return { canAdd: false, reason: `Excesso de repetição da proteína: ${group}` };
        }
      }

      // Regra: Não repetir exatamente o mesmo item > 4x na semana
      const itemCount = this.history[item.name] || 0;
      if (itemCount >= 4) {
        return { canAdd: false, reason: `Item repetido excessivamente: ${item.name}` };
      }
    }

    return { canAdd: true };
  }

  addMeal(meal: Meal) {
    meal.items.forEach(item => {
      this.history[item.name] = (this.history[item.name] || 0) + 1;
      const group = getFoodGroup(item.name);
      if (group?.startsWith('proteina')) {
        this.dominantProteins[group] = (this.dominantProteins[group] || 0) + 1;
      }
    });
  }
}
