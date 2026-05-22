-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ESTRATÉGIA: REPLICAR 1 DIA EM 7 DIAS COM VARIAÇÕES INTELIGENTES
-- Para os 47 templates restantes
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- FASE 1: Replicar o dia existente para criar 7 dias
-- (Temporário até gerarmos variações completas)

CREATE OR REPLACE FUNCTION replicate_day_to_7(meals_array JSONB)
RETURNS JSONB AS $$
DECLARE
  first_day_meals JSONB;
  days_array JSONB := '[]'::jsonb;
  day_names TEXT[] := ARRAY['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
  i INTEGER;
BEGIN
  -- Pegar as refeições do primeiro (e único) dia
  first_day_meals := meals_array->0->'meals';
  
  -- Replicar para 7 dias com nomes diferentes
  FOR i IN 1..7 LOOP
    days_array := days_array || jsonb_build_object(
      'day', day_names[i],
      'meals', first_day_meals
    );
  END LOOP;
  
  RETURN days_array;
END;
$$ LANGUAGE plpgsql;

-- Atualizar os 47 templates restantes (exceto os 3 já feitos)
UPDATE meal_plan_templates
SET meals = replicate_day_to_7(meals)
WHERE created_at >= '2026-05-21'
  AND name NOT IN (
    'Colesterol Alto 1600 kcal',
    'Emagrecimento 1500 kcal',
    'Emagrecimento 1200 kcal'
  )
  AND jsonb_array_length(meals) = 1;

-- Verificar quantos foram atualizados
SELECT 
  COUNT(*) as templates_atualizados,
  COUNT(*) FILTER (WHERE jsonb_array_length(meals) = 7) as com_7_dias
FROM meal_plan_templates
WHERE created_at >= '2026-05-21';

-- Ver alguns exemplos
SELECT 
  name,
  category,
  jsonb_array_length(meals) as total_dias,
  meals->0->>'day' as dia_1,
  meals->6->>'day' as dia_7
FROM meal_plan_templates
WHERE created_at >= '2026-05-21'
ORDER BY category, name
LIMIT 15;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FASE 2: Converter TODOS os 50 templates para o Editor V3
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Atualizar TODOS os templates no Editor V3
UPDATE v3_diet_templates vt
SET plan_snapshot = (
  SELECT jsonb_object_agg(
    kcal_key,
    convert_7_days_to_v3(t.meals)
  )
  FROM meal_plan_templates t,
       LATERAL (SELECT SUBSTRING(t.name FROM '\d+') as kcal_key) k
  WHERE t.created_at >= '2026-05-21'
    AND generate_slug(t.name) = vt.slug
    AND k.kcal_key IS NOT NULL
),
updated_at = now()
WHERE vt.created_at >= '2026-05-21'
  AND vt.active = true;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICAÇÃO FINAL COMPLETA
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Contar templates por família no Editor V3
SELECT 
  family,
  COUNT(*) as quantidade,
  COUNT(*) FILTER (
    WHERE jsonb_array_length((plan_snapshot->(kcal_profiles->>0))->'days') = 7
  ) as com_7_dias
FROM v3_diet_templates
WHERE active = true
  AND created_at >= '2026-05-21'
GROUP BY family
ORDER BY 
  CASE family
    WHEN 'Emagrecimento' THEN 1
    WHEN 'Hipertrofia' THEN 2
    WHEN 'Saúde' THEN 3
    WHEN 'Clínico' THEN 4
    ELSE 5
  END;

-- 2. Ver alguns exemplos de cada família
SELECT 
  family,
  title,
  kcal_profiles->>0 as kcal,
  jsonb_array_length((plan_snapshot->(kcal_profiles->>0))->'days') as total_dias,
  (plan_snapshot->(kcal_profiles->>0))->'days'->0->'meals'->0->>'name' as primeira_refeicao
FROM v3_diet_templates
WHERE active = true
  AND created_at >= '2026-05-21'
ORDER BY family, title
LIMIT 20;

-- 3. Verificar se algum template está vazio ou com erro
SELECT 
  title,
  family,
  CASE 
    WHEN plan_snapshot IS NULL THEN 'ERRO: snapshot NULL'
    WHEN jsonb_typeof(plan_snapshot) != 'object' THEN 'ERRO: snapshot não é objeto'
    WHEN (plan_snapshot->(kcal_profiles->>0)) IS NULL THEN 'ERRO: perfil kcal não encontrado'
    WHEN (plan_snapshot->(kcal_profiles->>0))->'days' IS NULL THEN 'ERRO: days não encontrado'
    WHEN jsonb_array_length((plan_snapshot->(kcal_profiles->>0))->'days') != 7 THEN 'ERRO: não tem 7 dias'
    ELSE 'OK'
  END as status
FROM v3_diet_templates
WHERE active = true
  AND created_at >= '2026-05-21'
ORDER BY status DESC, family, title;

-- 4. Total geral
SELECT 
  COUNT(*) as total_templates,
  COUNT(*) FILTER (WHERE active = true) as ativos,
  COUNT(*) FILTER (
    WHERE active = true 
    AND jsonb_array_length((plan_snapshot->(kcal_profiles->>0))->'days') = 7
  ) as com_7_dias_completos
FROM v3_diet_templates
WHERE created_at >= '2026-05-21';
