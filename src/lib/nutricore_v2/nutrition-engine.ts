import { solveMetabolicProfile, MetabolicProfile } from '@/features/editor-v3/services/deterministicEngine';

/**
 * Proxy Legado para o Novo Motor Determinístico
 */
export const runEngine = (data: any) => {
  const profile: MetabolicProfile = {
    age: data.age || 30,
    weight: data.weight || 70,
    height: data.height || 170,
    gender: data.gender === 'male' ? 'male' : 'female',
    activityLevel: data.activityLevel || 'moderate',
    goal: data.goal === 'lose_weight' ? 'loss' : 'maintenance'
  };
  
  const result = solveMetabolicProfile(profile);
  
  return {
    tmb: result.tmb,
    get: result.get,
    vet: result.vet,
    macros: result.macros
  };
};
