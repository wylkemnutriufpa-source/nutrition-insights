import { expect, test } from 'vitest';
import fs from 'fs';
import { runEngine } from '@/lib/nutricore_v2/nutrition-engine';

test('REGRESSÃO: Motor V2 não deve ser chamado no Editor V3', () => {
  const filesToCheck = [
    'src/features/editor-v3/components/EditorV3Page.tsx',
    'src/features/editor-v3/hooks/useEditorState.ts',
    'src/features/editor-v3/services/localPlanGenerator.ts',
    'src/features/clinical-engine/strategies/index.ts'
  ];

  filesToCheck.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Proibir referências explícitas ao Motor V2 em contextos de execução/interface
    const hasV2Reference = /Motor V2|NutriCoreV2Adapter/i.test(content);
    
    if (hasV2Reference) {
      console.error(`\n❌ FALHA DE REGRESSÃO: O arquivo ${file} contém referências ao Motor V2!\n`);
    }

    expect(hasV2Reference, `O arquivo ${file} contém referências ao Motor V2!`).toBe(false);
  });
});

test('REGRESSÃO: O Adaptador NutriCore deve ser V3', async () => {
  const adapterPath = 'src/lib/nutricore_v2/adapter.ts';
  const content = fs.readFileSync(adapterPath, 'utf8');
  
  const hasV3Class = content.includes('export class NutriCoreV3Adapter');
  const hasV2Class = content.includes('export class NutriCoreV2Adapter');

  expect(hasV3Class, 'A classe NutriCoreV3Adapter deve estar definida no adaptador.').toBe(true);
  expect(hasV2Class, 'A classe NutriCoreV2Adapter NÃO deve existir.').toBe(false);
});

test('SNAPSHOT: Lynn Ohana (63kg) deve ter ~1920 kcal', () => {
  const result = runEngine({
    weight_kg: 63,
    height_cm: 165,
    age_years: 30,
    sex: 'feminino',
    activity_level: 'moderado',
    goal: 'recomposicao'
  });

  const diff = Math.abs(result.target_kcal - 1920);
  expect(diff, `Lynn Ohana: esperado ~1920kcal, motor gerou ${result.target_kcal}kcal`).toBeLessThan(200);
});

test('SNAPSHOT: Ana Carla (77kg) deve ter ~1950 kcal', () => {
  const result = runEngine({
    weight_kg: 77,
    height_cm: 165, 
    age_years: 35,
    sex: 'feminino',
    activity_level: 'moderado',
    goal: 'recomposicao'
  });

  const diff = Math.abs(result.target_kcal - 1950);
  expect(diff, `Ana Carla: esperado ~1950kcal, motor gerou ${result.target_kcal}kcal`).toBeLessThan(200);
});

test('SNAPSHOT: Débora Encarnação (69kg) deve ter ~1980 kcal', () => {
  const result = runEngine({
    weight_kg: 69,
    height_cm: 160,
    age_years: 40,
    sex: 'feminino',
    activity_level: 'moderado',
    goal: 'manutencao'
  });

  const diff = Math.abs(result.target_kcal - 1980);
  expect(diff, `Débora Encarnação: esperado ~1980kcal, motor gerou ${result.target_kcal}kcal`).toBeLessThan(200);
});
