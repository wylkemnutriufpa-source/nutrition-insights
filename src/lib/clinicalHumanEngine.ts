// 🛡️ Stub: Motor de score humano desativado (soberania manual do nutricionista).
export interface HumanMealScore {
  score: number;
  status: 'ok' | 'warning' | 'absurd';
  reasons: string[];
}

export function calculateHumanMealScore(_meal: any, _slot?: string, _contract?: any): HumanMealScore {
  return { score: 100, status: 'ok', reasons: [] };
}
