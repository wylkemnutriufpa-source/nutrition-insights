-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- INTEGRAÇÃO DOS 62 TEMPLATES SOBERANOS NO EDITOR V3 - VERSÃO FINAL CORRIGIDA
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Adicionar colunas plan_snapshot e family
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'v3_diet_templates' 
    AND column_name = 'plan_snapshot'
  ) THEN
    ALTER TABLE v3_diet_templates 
    ADD COLUMN plan_snapshot JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'v3_diet_templates' 
    AND column_name = 'family'
  ) THEN
    ALTER TABLE v3_diet_templates 
    ADD COLUMN family TEXT;
  END IF;
END $$;

-- Marcar templates antigos como inativos
UPDATE v3_diet_templates 
SET active = false 
WHERE slug NOT IN (
  'hipertrofia_tradicional', 
  'emagrecimento_tradicional', 
  'low_carb', 
  'cetogenica', 
  'mediterranea', 
  'performance_esportiva', 
  'recomposicao_corporal', 
  'diabetes_resistencia_insulinica', 
  'plano_feminino_leve', 
  'plano_masculino_alta_saciedade'
);

-- Função para gerar slug
CREATE OR REPLACE FUNCTION generate_slug(name TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(name, '[áàâãä]', 'a', 'g'),
        '[éèêë]', 'e', 'g'
      ),
      '[^a-z0-9]+', '_', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Inserir templates soberanos (só os que têm kcal no nome e meals válidos)
INSERT INTO v3_diet_templates (
  slug,
  title,
  description,
  objective,
  family,
  meal_distribution,
  cluster_map,
  kcal_profiles,
  plan_snapshot,
  active
)
SELECT 
  generate_slug(t.name) as slug,
  t.name as title,
  COALESCE(t.description, 'Template soberano com refeições completas e modulares') as description,
  CASE t.category
    WHEN 'emagrecimento' THEN 'emagrecimento'
    WHEN 'hipertrofia' THEN 'hipertrofia'
    WHEN 'saude' THEN 'saude'
    WHEN 'clinico' THEN 'saude'
    ELSE 'saude'
  END as objective,
  CASE t.category
    WHEN 'emagrecimento' THEN 'Emagrecimento'
    WHEN 'hipertrofia' THEN 'Hipertrofia'
    WHEN 'saude' THEN 'Saúde'
    WHEN 'clinico' THEN 'Clínico'
    ELSE 'Geral'
  END as family,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'slot', meal->>'name',
          'time', COALESCE(meal->>'time', '08:00')
        )
      )
      FROM jsonb_array_elements(
        COALESCE(t.meals->0->'meals', '[]'::jsonb)
      ) as meal
      WHERE jsonb_array_length(COALESCE(t.meals->0->'meals', '[]'::jsonb)) > 0
    ),
    '[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:00"}, {"slot": "dinner", "time": "19:00"}]'::jsonb
  ) as meal_distribution,
  '{}'::jsonb as cluster_map,
  jsonb_build_array(
    COALESCE(CAST(SUBSTRING(t.name FROM '\d+') AS INTEGER), 1500)
  ) as kcal_profiles,
  jsonb_build_object(
    COALESCE(SUBSTRING(t.name FROM '\d+'), '1500'),
    t.meals
  ) as plan_snapshot,
  true as active
FROM meal_plan_templates t
WHERE t.created_at >= '2026-05-21'
  AND t.category IN ('saude', 'emagrecimento', 'hipertrofia', 'clinico')
  AND t.name LIKE '%kcal'
  AND jsonb_array_length(t.meals) > 0
  AND SUBSTRING(t.name FROM '\d+') IS NOT NULL  -- Garantir que tem número no nome
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  objective = EXCLUDED.objective,
  family = EXCLUDED.family,
  meal_distribution = EXCLUDED.meal_distribution,
  kcal_profiles = EXCLUDED.kcal_profiles,
  plan_snapshot = EXCLUDED.plan_snapshot,
  active = EXCLUDED.active,
  updated_at = now();

-- Inserir templates de restrições (só os que têm dietary_restrictions e meals válidos)
INSERT INTO v3_diet_templates (
  slug,
  title,
  description,
  objective,
  family,
  meal_distribution,
  cluster_map,
  kcal_profiles,
  plan_snapshot,
  active
)
SELECT 
  generate_slug(t.name) as slug,
  t.name as title,
  COALESCE(t.description, 'Template com restrições alimentares') as description,
  'saude' as objective,
  'Restrições Alimentares' as family,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'slot', meal->>'name',
          'time', COALESCE(meal->>'time', '08:00')
        )
      )
      FROM jsonb_array_elements(
        COALESCE(t.meals->0->'meals', '[]'::jsonb)
      ) as meal
      WHERE jsonb_array_length(COALESCE(t.meals->0->'meals', '[]'::jsonb)) > 0
    ),
    '[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:00"}, {"slot": "dinner", "time": "19:00"}]'::jsonb
  ) as meal_distribution,
  '{}'::jsonb as cluster_map,
  jsonb_build_array(
    COALESCE(CAST(SUBSTRING(t.name FROM '\d+') AS INTEGER), 1400)
  ) as kcal_profiles,
  jsonb_build_object(
    COALESCE(SUBSTRING(t.name FROM '\d+'), '1400'),
    t.meals
  ) as plan_snapshot,
  true as active
FROM meal_plan_templates t
WHERE t.dietary_restrictions IS NOT NULL
  AND jsonb_array_length(t.meals) > 0
  AND SUBSTRING(t.name FROM '\d+') IS NOT NULL  -- Garantir que tem número no nome
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  family = EXCLUDED.family,
  meal_distribution = EXCLUDED.meal_distribution,
  kcal_profiles = EXCLUDED.kcal_profiles,
  plan_snapshot = EXCLUDED.plan_snapshot,
  active = EXCLUDED.active,
  updated_at = now();

-- Função de busca por família
CREATE OR REPLACE FUNCTION get_v3_templates_by_family(p_family TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  title TEXT,
  description TEXT,
  objective TEXT,
  family TEXT,
  meal_distribution JSONB,
  kcal_profiles JSONB,
  plan_snapshot JSONB,
  active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.slug,
    t.title,
    t.description,
    t.objective,
    t.family,
    t.meal_distribution,
    t.kcal_profiles,
    t.plan_snapshot,
    t.active
  FROM v3_diet_templates t
  WHERE 
    t.active = true
    AND (p_family IS NULL OR t.family = p_family)
  ORDER BY t.family, t.title;
END;
$$ LANGUAGE plpgsql;

-- View agrupada por família
CREATE OR REPLACE VIEW v3_templates_by_family AS
SELECT 
  family,
  COUNT(*) as template_count,
  jsonb_agg(
    jsonb_build_object(
      'id', id,
      'slug', slug,
      'title', title,
      'description', description,
      'objective', objective,
      'kcal_profiles', kcal_profiles
    ) ORDER BY title
  ) as templates
FROM v3_diet_templates
WHERE active = true
GROUP BY family
ORDER BY 
  CASE family
    WHEN 'Emagrecimento' THEN 1
    WHEN 'Hipertrofia' THEN 2
    WHEN 'Saúde' THEN 3
    WHEN 'Clínico' THEN 4
    WHEN 'Restrições Alimentares' THEN 5
    ELSE 6
  END;

-- Verificação final
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM v3_diet_templates WHERE active = true;
  RAISE NOTICE '✅ Total de templates ativos no Editor V3: %', v_count;
END $$;
