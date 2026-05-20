
import { generatePremiumTemplates } from './src/lib/seedV3Templates';
import fs from 'fs';

const templates = generatePremiumTemplates();

let sql = '';
for (const t of templates) {
  const data = {
    ...t,
    active: true,
    sovereign_validated: true,
    updated_at: new Date().toISOString()
  };
  
  const columns = ['slug', 'title', 'description', 'template_type', 'objective', 'visual_style', 'kcal_profiles', 'meal_distribution', 'plan_snapshot', 'active', 'sovereign_validated', 'updated_at'];
  
  const vals = [
    `'${data.slug}'`,
    `'${data.title.replace(/'/g, "''")}'`,
    `'${data.description.replace(/'/g, "''")}'`,
    `'${data.template_type}'`,
    `'${data.objective}'`,
    `'${data.visual_style}'`,
    `'${JSON.stringify(data.kcal_profiles)}'::jsonb`,
    `'${JSON.stringify(data.meal_distribution).replace(/'/g, "''")}'::jsonb`,
    `'${JSON.stringify(data.plan_snapshot).replace(/'/g, "''")}'::jsonb`,
    'true',
    'true',
    'now()'
  ];

  sql += `INSERT INTO v3_diet_templates (${columns.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT (slug) DO UPDATE SET plan_snapshot = EXCLUDED.plan_snapshot, sovereign_validated = true, active = true, updated_at = now();\n`;
}

fs.writeFileSync('reseed_templates.sql', sql);
