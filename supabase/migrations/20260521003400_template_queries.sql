-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- QUERIES E FUNÇÕES PARA FILTRAR E BUSCAR TEMPLATES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: Buscar templates com filtros avançados
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION search_templates(
  p_category TEXT DEFAULT NULL,
  p_min_kcal INTEGER DEFAULT NULL,
  p_max_kcal INTEGER DEFAULT NULL,
  p_dietary_restrictions TEXT[] DEFAULT NULL,
  p_search_text TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  description TEXT,
  kcal_range TEXT,
  has_restrictions BOOLEAN,
  dietary_restrictions TEXT,
  is_marmita BOOLEAN,
  meals JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.category,
    t.description,
    SUBSTRING(t.name FROM '\d+') as kcal_range,
    (t.dietary_restrictions IS NOT NULL) as has_restrictions,
    t.dietary_restrictions,
    COALESCE(t.template_marmita, false) as is_marmita,
    t.meals,
    t.created_at
  FROM meal_plan_templates t
  WHERE 
    -- Filtro por categoria
    (p_category IS NULL OR t.category = p_category)
    -- Filtro por faixa calórica
    AND (
      p_min_kcal IS NULL 
      OR CAST(SUBSTRING(t.name FROM '\d+') AS INTEGER) >= p_min_kcal
    )
    AND (
      p_max_kcal IS NULL 
      OR CAST(SUBSTRING(t.name FROM '\d+') AS INTEGER) <= p_max_kcal
    )
    -- Filtro por restrições alimentares
    AND (
      p_dietary_restrictions IS NULL 
      OR t.dietary_restrictions = ANY(p_dietary_restrictions)
    )
    -- Busca por texto
    AND (
      p_search_text IS NULL 
      OR t.name ILIKE '%' || p_search_text || '%'
      OR t.description ILIKE '%' || p_search_text || '%'
    )
  ORDER BY t.category, t.name;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: Obter estatísticas dos templates
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_template_stats()
RETURNS TABLE (
  total_templates BIGINT,
  by_category JSONB,
  by_kcal_range JSONB,
  with_restrictions BIGINT,
  marmita_templates BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_templates,
    jsonb_object_agg(
      category, 
      count
    ) as by_category,
    jsonb_object_agg(
      kcal_range,
      count
    ) as by_kcal_range,
    COUNT(*) FILTER (WHERE dietary_restrictions IS NOT NULL)::BIGINT as with_restrictions,
    COUNT(*) FILTER (WHERE template_marmita = true)::BIGINT as marmita_templates
  FROM (
    SELECT 
      category,
      COUNT(*) as count,
      CASE 
        WHEN CAST(SUBSTRING(name FROM '\d+') AS INTEGER) < 1500 THEN '1200-1499'
        WHEN CAST(SUBSTRING(name FROM '\d+') AS INTEGER) < 1800 THEN '1500-1799'
        WHEN CAST(SUBSTRING(name FROM '\d+') AS INTEGER) < 2200 THEN '1800-2199'
        ELSE '2200+'
      END as kcal_range,
      dietary_restrictions,
      template_marmita
    FROM meal_plan_templates
    GROUP BY category, kcal_range, dietary_restrictions, template_marmita
  ) stats
  GROUP BY ();
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: Obter templates similares (baseado em calorias e categoria)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_similar_templates(
  p_template_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  description TEXT,
  kcal_difference INTEGER,
  similarity_score NUMERIC
) AS $$
DECLARE
  v_category TEXT;
  v_kcal INTEGER;
BEGIN
  -- Obter categoria e calorias do template de referência
  SELECT 
    t.category,
    CAST(SUBSTRING(t.name FROM '\d+') AS INTEGER)
  INTO v_category, v_kcal
  FROM meal_plan_templates t
  WHERE t.id = p_template_id;

  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.category,
    t.description,
    ABS(CAST(SUBSTRING(t.name FROM '\d+') AS INTEGER) - v_kcal) as kcal_difference,
    -- Score de similaridade (0-100)
    (100 - (ABS(CAST(SUBSTRING(t.name FROM '\d+') AS INTEGER) - v_kcal) / 10.0))::NUMERIC as similarity_score
  FROM meal_plan_templates t
  WHERE 
    t.id != p_template_id
    AND t.category = v_category
  ORDER BY kcal_difference ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEW: Templates com informações calculadas
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW templates_enriched AS
SELECT 
  t.id,
  t.name,
  t.category,
  t.description,
  t.meals,
  t.dietary_restrictions,
  t.template_marmita,
  t.is_premium,
  t.created_at,
  -- Extrair calorias do nome
  CAST(SUBSTRING(t.name FROM '\d+') AS INTEGER) as kcal_target,
  -- Contar dias no template
  jsonb_array_length(t.meals) as total_days,
  -- Contar refeições totais
  (
    SELECT SUM(jsonb_array_length(day->'meals'))
    FROM jsonb_array_elements(t.meals) as day
  )::INTEGER as total_meals,
  -- Verificar se tem imagens
  (
    SELECT bool_and((meal->>'image') IS NOT NULL)
    FROM jsonb_array_elements(t.meals) as day,
         jsonb_array_elements(day->'meals') as meal
  ) as all_meals_have_images,
  -- Categoria legível
  CASE t.category
    WHEN 'saude' THEN 'Saúde'
    WHEN 'emagrecimento' THEN 'Emagrecimento'
    WHEN 'hipertrofia' THEN 'Hipertrofia'
    WHEN 'clinico' THEN 'Clínico'
    ELSE t.category
  END as category_label
FROM meal_plan_templates t;

-- ═══════════════════════════════════════════════════════════════════════════
-- COMENTÁRIOS
-- ═══════════════════════════════════════════════════════════════════════════
COMMENT ON FUNCTION search_templates IS 'Busca templates com filtros avançados (categoria, calorias, restrições, texto)';
COMMENT ON FUNCTION get_template_stats IS 'Retorna estatísticas gerais dos templates';
COMMENT ON FUNCTION get_similar_templates IS 'Retorna templates similares baseado em calorias e categoria';
COMMENT ON VIEW templates_enriched IS 'View com informações calculadas dos templates (calorias, dias, refeições, etc)';
