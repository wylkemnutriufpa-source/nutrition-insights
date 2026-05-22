-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- INTEGRAÇÃO DOS 62 TEMPLATES SOBERANOS NO EDITOR V3
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Este SQL converte os templates de meal_plan_templates para v3_diet_templates
-- mantendo a SOBERANIA CLÍNICA e a estrutura de snapshots
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 1: Adicionar coluna plan_snapshot se não existir
-- ═══════════════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 2: Limpar templates antigos (manter apenas os 10 originais)
-- ═══════════════════════════════════════════════════════════════════════════
-- Não vamos deletar, apenas marcar como inativos os que não são dos 62 novos
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

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 3: Inserir os 62 templates soberanos no formato V3
-- ═══════════════════════════════════════════════════════════════════════════
-- Função auxiliar para gerar slug a partir do nome
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

-- Inserir templates convertidos
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
  -- Mapear category para objective
  CASE t.category
    WHEN 'emagrecimento' THEN 'emagrecimento'
    WHEN 'hipertrofia' THEN 'hipertrofia'
    WHEN 'saude' THEN 'saude'
    WHEN 'clinico' THEN 'saude'
    ELSE 'saude'
  END as objective,
  -- Family baseado na categoria
  CASE t.category
    WHEN 'emagrecimento' THEN 'Emagrecimento'
    WHEN 'hipertrofia' THEN 'Hipertrofia'
    WHEN 'saude' THEN 'Saúde'
    WHEN 'clinico' THEN 'Clínico'
    ELSE 'Geral'
  END as family,
  -- Extrair meal_distribution do primeiro dia
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'slot', meal->>'name',
        'time', COALESCE(meal->>'time', '08:00')
      )
    )
    FROM jsonb_array_elements(
      (t.meals->0->'meals')
    ) as meal
  ) as meal_distribution,
  -- Cluster map genérico (será sobrescrito pelo snapshot)
  '{}'::jsonb as cluster_map,
  -- Extrair kcal do nome (ex: "Hipertrofia 2600 kcal" -> [2600])
  jsonb_build_array(
    CAST(SUBSTRING(t.name FROM '\d+') AS INTEGER)
  ) as kcal_profiles,
  -- Plan snapshot: converter meals JSONB para formato V3
  jsonb_build_object(
    SUBSTRING(t.name FROM '\d+'),
    t.meals
  ) as plan_snapshot,
  true as active
FROM meal_plan_templates t
WHERE t.tipo = 'NOVO (Soberano)'
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

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 4: Adicionar templates de restrições alimentares
-- ═══════════════════════════════════════════════════════════════════════════
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
  COALESCE(t.description, 'Template com restrições alimentares: ' || t.dietary_restrictions) as description,
  'saude' as objective,
  'Restrições Alimentares' as family,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'slot', meal->>'name',
        'time', COALESCE(meal->>'time', '08:00')
      )
    )
    FROM jsonb_array_elements(
      (t.meals->0->'meals')
    ) as meal
  ) as meal_distribution,
  '{}'::jsonb as cluster_map,
  jsonb_build_array(
    CAST(SUBSTRING(t.name FROM '\d+') AS INTEGER)
  ) as kcal_profiles,
  jsonb_build_object(
    SUBSTRING(t.name FROM '\d+'),
    t.meals
  ) as plan_snapshot,
  true as active
FROM meal_plan_templates t
WHERE t.dietary_restrictions IS NOT NULL
  AND t.dietary_restrictions != ''
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  family = EXCLUDED.family,
  meal_distribution = EXCLUDED.meal_distribution,
  kcal_profiles = EXCLUDED.kcal_profiles,
  plan_snapshot = EXCLUDED.plan_snapshot,
  active = EXCLUDED.active,
  updated_at = now();

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 5: Atualizar função de busca para incluir family
-- ═══════════════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 6: Criar view para listar templates agrupados por família
-- ═══════════════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════════════
-- COMENTÁRIOS
-- ═══════════════════════════════════════════════════════════════════════════
COMMENT ON COLUMN v3_diet_templates.plan_snapshot IS 'Snapshot completo do plano por perfil calórico (ex: {"1400": [...meals...], "1800": [...meals...]})';
COMMENT ON COLUMN v3_diet_templates.family IS 'Família do template (Emagrecimento, Hipertrofia, Saúde, Clínico, Restrições Alimentares)';
COMMENT ON FUNCTION get_v3_templates_by_family IS 'Busca templates V3 filtrados por família';
COMMENT ON VIEW v3_templates_by_family IS 'View com templates agrupados por família';

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO FINAL
-- ═══════════════════════════════════════════════════════════════════════════
-- Contar templates ativos
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM v3_diet_templates WHERE active = true;
  RAISE NOTICE '✅ Total de templates ativos no Editor V3: %', v_count;
END $$;
