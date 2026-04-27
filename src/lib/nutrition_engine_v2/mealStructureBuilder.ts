/**
 * Etapa 2: mealStructureBuilder.ts
 * Responsabilidade: Converter dados da anamnese em estrutura de refeições.
 */

export type MealPeriod = 'morning' | 'afternoon' | 'night';
export type MealTypeHint = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout';

export interface MealStructureInput {
  time: string; // HH:mm
  label?: string;
}

export interface MealStructure {
  id: string;
  name: string;
  time: string;
  period: MealPeriod;
  type_hint: MealTypeHint;
}

/**
 * Inferência automática de período:
 * 05:00–10:59 → morning
 * 11:00–17:59 → afternoon
 * 18:00–04:59 → night (approximate as dinner/evening)
 */
export function inferPeriod(time: string): MealPeriod {
  const hour = parseInt(time.split(':')[0], 10);
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 18) return 'afternoon';
  return 'night';
}

/**
 * Inferência de type_hint baseada no horário e label
 */
export function inferTypeHint(time: string, label?: string): MealTypeHint {
  const hour = parseInt(time.split(':')[0], 10);
  const normalizedLabel = label?.toLowerCase() || '';

  if (normalizedLabel.includes('almoço')) return 'lunch';
  if (normalizedLabel.includes('jantar')) return 'dinner';
  if (normalizedLabel.includes('café') || normalizedLabel.includes('desjejum')) return 'breakfast';
  if (normalizedLabel.includes('pré')) return 'pre_workout';
  if (normalizedLabel.includes('pós')) return 'post_workout';

  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 12 && hour < 14) return 'lunch';
  if (hour >= 19 && hour < 21) return 'dinner';
  
  return 'snack';
}

export function buildMealStructure(inputs: MealStructureInput[]): MealStructure[] {
  // Ordenar por horário
  const sorted = [...inputs].sort((a, b) => a.time.localeCompare(b.time));

  return sorted.map((input, index) => {
    const period = inferPeriod(input.time);
    const type_hint = inferTypeHint(input.time, input.label);
    
    return {
      id: `meal_${index}_${input.time.replace(':', '')}`,
      name: input.label || `Refeição ${index + 1}`,
      time: input.time,
      period,
      type_hint
    };
  });
}
