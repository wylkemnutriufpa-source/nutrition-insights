-- ============================================================
-- QUERIES DE DIAGNÓSTICO — Execute uma por uma no Supabase
-- ============================================================

-- 1. QUANTOS ALIMENTOS TEM NO BANCO?
SELECT COUNT(*) as total_alimentos FROM foods;

-- 2. QUAIS SÃO OS ALIMENTOS? (primeiros 10)
SELECT id, name, kcal_100g, unit, portion_label FROM foods LIMIT 10;

-- 3. QUANTOS TEMPLATES TEM?
SELECT COUNT(*) as total_templates FROM v3_diet_templates;

-- 4. QUAIS SÃO OS TEMPLATES?
SELECT id, title, slug, kcal_target, active FROM v3_diet_templates;

-- 5. QUANTOS PACIENTES TEM?
SELECT COUNT(*) as total_pacientes FROM patients;

-- 6. QUANTOS PLANOS DE REFEIÇÃO TEM?
SELECT COUNT(*) as total_meal_plans FROM meal_plans;

-- 7. QUANTOS ITENS DE PLANO TEM?
SELECT COUNT(*) as total_meal_plan_items FROM meal_plan_items;

-- 8. ESTRUTURA DAS TABELAS (verificar se existem)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 9. VERIFICAR RLS POLICIES
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- 10. VERIFICAR SE TEMPLATES TÊM DADOS
SELECT 
  id, 
  title, 
  kcal_target, 
  jsonb_array_length(plan_snapshot->'days') as dias,
  jsonb_array_length(tags) as tags
FROM v3_diet_templates
LIMIT 5;

-- ============================================================
-- RESUMO RÁPIDO (execute tudo de uma vez)
-- ============================================================

SELECT 
  (SELECT COUNT(*) FROM foods) as alimentos,
  (SELECT COUNT(*) FROM v3_diet_templates) as templates,
  (SELECT COUNT(*) FROM patients) as pacientes,
  (SELECT COUNT(*) FROM meal_plans) as planos,
  (SELECT COUNT(*) FROM meal_plan_items) as itens;
