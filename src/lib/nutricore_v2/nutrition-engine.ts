import { solveMetabolicProfile, MetabolicProfile } from '@/features/editor-v3/services/deterministicEngine';

/**
 * Proxy Legado para o Novo Motor Determinístico
 * Mapeia os campos para o formato esperado pelo front legado (Anamnesis.tsx)
 */
export const runEngine = (data: any) => {
  const profile: MetabolicProfile = {
    age: Number(data.age) || 30,
    weight: Number(data.weight) || 70,
    height: Number(data.height) || 170,
    gender: data.sex === 'male' || data.gender === 'male' ? 'male' : 'female',
    activityLevel: (data.activity_level || data.activityLevel || 'moderate') as any,
    goal: (data.goal === 'lose_weight' ? 'loss' : data.goal === 'gain_muscle' ? 'gain' : 'maintenance') as any
  };
  
  const result = solveMetabolicProfile(profile);
  
  return {
    bmr_kcal: result.tmb,
    tdee_kcal: result.get,
    target_kcal: result.vet,
    macros: {
      protein_g: result.macros.protein,
      carb_g: result.macros.carbs,
      fat_g: result.macros.fat
    }
  };
};
