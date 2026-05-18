
import { promises as fs } from 'fs';
import path from 'path';

async function fixImports() {
  const files = [
    'src/components/patient/DailyMealPlanInline.tsx',
    'src/components/patient/ExpandableMealPlanCard.tsx',
    'src/components/patient/PatientProfileMealPlan.tsx',
    'src/features/editor-v3/components/EditorV3Page.tsx',
    'src/lib/pdfExportPremium.ts'
  ];

  for (const file of files) {
    let content = await fs.readFile(file, 'utf8');
    content = content.replace(/@\/lib\/mealPlanDisplay/g, '@/lib/legacy/mealPlanDisplay');
    content = content.replace(/@\/lib\/mealPlanNormalizer/g, '@/lib/legacy/mealPlanNormalizer');
    
    // For local relative imports in src/lib/
    if (file === 'src/lib/pdfExportPremium.ts') {
        content = content.replace(/\.\/mealPlanDisplay/g, './legacy/mealPlanDisplay');
    }
    
    await fs.writeFile(file, content);
  }
}

fixImports();
