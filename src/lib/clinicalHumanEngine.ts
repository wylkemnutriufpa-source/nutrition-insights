// 🛡️ Stub: Score humano desativado.
export type HumanScoreStatus = 'ok' | 'warning' | 'absurd' | 'human' | 'robotic';
export interface HumanMealScore {
  score: number;
  status: HumanScoreStatus;
  reasons: string[];
}
export function calculateHumanMealScore(_meal: any, _slot?: string, _contract?: any): HumanMealScore {
  return { score: 100, status: 'ok', reasons: [] };
}
