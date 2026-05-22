-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🔍 DIAGNÓSTICO SIMPLES - COPIE E COLE NO SUPABASE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Query 1: Ver todos os templates ativos
SELECT 
  title,
  active
FROM v3_diet_templates
WHERE active = true;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Query 2: Ver se a coluna plan_snapshot existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'v3_diet_templates' 
  AND column_name IN ('plan_snapshot', 'family', 'kcal');

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Query 3: Ver estrutura da tabela meal_plan_templates (fonte dos dados)
SELECT 
  name,
  jsonb_array_length(meals) as total_dias
FROM meal_plan_templates
WHERE name LIKE '%1500%'
LIMIT 5;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ✅ RESULTADO ESPERADO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- Query 1: Lista de templates ativos (deve ter pelo menos 3)
-- Query 2: Deve mostrar se plan_snapshot existe
-- Query 3: Deve mostrar templates da tabela antiga com 7 dias
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ME ENVIE O RESULTADO DESTAS 3 QUERIES!
