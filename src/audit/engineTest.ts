import { solveMetabolicProfile, MetabolicProfile } from './src/features/editor-v3/services/deterministicEngine';

const testProfiles: MetabolicProfile[] = [
  {
    age: 30,
    weight: 80,
    height: 180,
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'loss'
  },
  {
    age: 25,
    weight: 60,
    height: 165,
    gender: 'female',
    activityLevel: 'sedentary',
    goal: 'gain'
  }
];

testProfiles.forEach(p => {
  const res = solveMetabolicProfile(p);
  console.log(`Profile: ${p.gender}, ${p.weight}kg, ${p.goal}`);
  console.log(`TMB: ${res.tmb}, GET: ${res.get}, VET: ${res.vet}`);
  console.log(`Macros: P:${res.macros.protein}g, C:${res.macros.carbs}g, F:${res.macros.fat}g`);
  console.log('---');
});
