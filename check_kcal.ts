
import { runEngine } from './src/lib/nutricore_v2/nutrition-engine.ts';

const lynn = runEngine({
  weight_kg: 63,
  height_cm: 165,
  age_years: 30,
  sex: 'feminino',
  activity_level: 'moderado',
  goal: 'manutencao'
});

const ana = runEngine({
  weight_kg: 77,
  height_cm: 165,
  age_years: 35,
  sex: 'feminino',
  activity_level: 'moderado',
  goal: 'manutencao'
});

console.log('--- Lynn Ohana (63kg) ---');
console.log(`Target: ${lynn.target_kcal} kcal`);
console.log(`Expected: ~1920 kcal`);
console.log(`Diff: ${Math.abs(lynn.target_kcal - 1920)}`);

console.log('\n--- Ana Carla (77kg) ---');
console.log(`Target: ${ana.target_kcal} kcal`);
console.log(`Expected: ~1950 kcal (range 1900-2000)`);
console.log(`Diff: ${Math.abs(ana.target_kcal - 1950)}`);

const anaEmagrecimento = runEngine({
  weight_kg: 77,
  height_cm: 165,
  age_years: 35,
  sex: 'feminino',
  activity_level: 'moderado',
  goal: 'emagrecimento'
});
console.log(`\nAna (Emagrecimento): ${anaEmagrecimento.target_kcal} kcal`);

const anaRecomposicao = runEngine({
  weight_kg: 77,
  height_cm: 165,
  age_years: 35,
  sex: 'feminino',
  activity_level: 'moderado',
  goal: 'recomposicao'
});
console.log(`Ana (Recomposição): ${anaRecomposicao.target_kcal} kcal`);
