// Stub: clinical human engine removed. Returns neutral score.
export interface HumanMealScore {
  score: number;
  status: 'human' | 'robotic' | 'ok';
  reasons: string[];
}

export function calculateHumanMealScore(_meal: any, _mealType?: string): HumanMealScore {
  return { score: 100, status: 'ok', reasons: [] };
}
