
import fs from 'fs';

const templates = JSON.parse(fs.readFileSync('generated_templates.json', 'utf8'));

for (let i = 0; i < templates.length; i++) {
  const t = templates[i];
  const sql = `
DO $$
DECLARE
  v_snap jsonb := '${JSON.stringify(t.plan_snapshot).replace(/'/g, "''")}';
  v_dist jsonb := '${JSON.stringify(t.meal_distribution).replace(/'/g, "''")}';
  v_prof jsonb := '${JSON.stringify(t.kcal_profiles)}';
BEGIN
  UPDATE v3_diet_templates SET 
    description = '${t.description.replace(/'/g, "''")}',
    kcal_profiles = v_prof,
    meal_distribution = v_dist,
    plan_snapshot = v_snap,
    active = true,
    sovereign_validated = true,
    updated_at = now()
  WHERE slug = '${t.slug}';
END $$;
`;
  fs.writeFileSync(`fix_template_${i}.sql`, sql);
}
console.log('Split into 14 SQL files with DO blocks');
