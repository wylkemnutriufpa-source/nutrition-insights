
import fs from 'fs';

const templates = JSON.parse(fs.readFileSync('generated_templates.json', 'utf8'));

for (let i = 0; i < templates.length; i++) {
  const t = templates[i];
  const sql = `UPDATE v3_diet_templates SET 
    description = '${t.description.replace(/'/g, "''")}',
    kcal_profiles = '${JSON.stringify(t.kcal_profiles)}'::jsonb,
    meal_distribution = '${JSON.stringify(t.meal_distribution).replace(/'/g, "''")}'::jsonb,
    plan_snapshot = '${JSON.stringify(t.plan_snapshot).replace(/'/g, "''")}'::jsonb,
    active = true,
    sovereign_validated = true,
    updated_at = now()
  WHERE slug = '${t.slug}';\n`;
  fs.writeFileSync(`fix_template_${i}.sql`, sql);
}
console.log('Split into 14 SQL files');
