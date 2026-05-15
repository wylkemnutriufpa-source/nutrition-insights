-- Update Hipertrofia Masculina Premium
UPDATE v3_diet_templates 
SET cluster_map = '{
  "Café da Manhã": "cafe_proteico",
  "Lanche da Manhã": "lanche_proteico",
  "Almoço": "almoco_premium",
  "Lanche da Tarde": "lanche_performance",
  "Jantar": "almoco_tradicional",
  "Ceia": "lanche_leve"
}'::jsonb
WHERE slug = 'hipertrofia-masculina';

-- Update Emagrecimento Feminino Acelerado
UPDATE v3_diet_templates 
SET cluster_map = '{
  "Café da Manhã": "cafe_saudavel",
  "Almoço": "almoco_saudavel",
  "Lanche da Tarde": "lanche_proteico",
  "Jantar": "jantar_leve"
}'::jsonb
WHERE slug = 'emagrecimento-feminino';

-- Update Low Carb Elite
UPDATE v3_diet_templates 
SET cluster_map = '{
  "Café da Manhã": "cafe_proteico",
  "Almoço": "almoco_saudavel",
  "Lanche da Tarde": "lanche_proteico",
  "Jantar": "jantar_leve"
}'::jsonb
WHERE slug = 'low-carb-elite';

-- Update Mediterrânea Anti-inflamatória
UPDATE v3_diet_templates 
SET cluster_map = '{
  "Café da Manhã": "cafe_premium",
  "Almoço": "almoco_mediterraneo",
  "Lanche da Tarde": "lanche_fruta",
  "Jantar": "jantar_leve"
}'::jsonb
WHERE slug = 'mediterranea-pro';

-- Update Protocolo SOP & Menopausa
UPDATE v3_diet_templates 
SET cluster_map = '{
  "Café da Manhã": "cafe_saudavel",
  "Almoço": "almoco_tradicional",
  "Lanche da Tarde": "lanche_proteico",
  "Jantar": "jantar_leve"
}'::jsonb
WHERE slug = 'sop-menopausa';

-- Ensure all templates have valid mapping
UPDATE v3_diet_templates 
SET cluster_map = '{
  "Café da Manhã": "cafe_tradicional",
  "Almoço": "almoco_tradicional",
  "Lanche da Tarde": "lanche_pratico",
  "Jantar": "almoco_regional"
}'::jsonb
WHERE cluster_map IS NULL OR cluster_map = '{}'::jsonb;

-- Insert Fit Econômico if it doesn't exist
INSERT INTO v3_diet_templates (
  id, title, slug, objective, description, kcal_profiles, 
  meal_distribution, cluster_map, template_type, visual_style, 
  active, substitutions_enabled, editable
)
VALUES (
  gen_random_uuid(),
  'Fit Econômico Real',
  'fit-economico',
  'Economia',
  'Alimentação limpa com ingredientes acessíveis do dia a dia brasileiro.',
  '[1200, 1400, 1600, 1800, 2000, 2500, 3000]',
  '[
    {"slot": "Café da Manhã", "time": "08:00"},
    {"slot": "Almoço", "time": "12:30"},
    {"slot": "Lanche da Tarde", "time": "16:00"},
    {"slot": "Jantar", "time": "19:30"}
  ]'::jsonb,
  '{
    "Café da Manhã": "cafe_tradicional",
    "Almoço": "almoco_economico",
    "Lanche da Tarde": "lanche_pratico",
    "Jantar": "almoco_economico"
  }'::jsonb,
  'visual_v3',
  'minimalist',
  true,
  true,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  cluster_map = EXCLUDED.cluster_map,
  title = EXCLUDED.title;
