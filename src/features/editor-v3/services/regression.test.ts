import { expect, test } from 'vitest';
import fs from 'fs';
import path from 'fs';

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
    // Ignoramos o path 'nutricore_v2' pois é o nome do diretório físico
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
