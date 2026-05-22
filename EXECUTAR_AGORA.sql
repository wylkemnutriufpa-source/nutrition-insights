-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🔍 DIAGNÓSTICO URGENTE - COPIE E COLE NO SUPABASE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Query 1: Ver estrutura completa do primeiro template
SELECT 
  title,
  kcal_profiles,
  active,
  plan_snapshot->'1500' as snapshot_1500
FROM v3_diet_templates
WHERE active = true
LIMIT 1;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Query 2: Contar templates ativos
SELECT 
  COUNT(*) as total_ativos,
  COUNT(*) FILTER (WHERE plan_snapshot IS NOT NULL) as com_snapshot,
  COUNT(*) FILTER (WHERE plan_snapshot IS NULL) as sem_snapshot
FROM v3_diet_templates
WHERE active = true;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Query 3: Ver primeira refeição do primeiro dia
SELECT 
  title,
  plan_snapshot->'1500'->0->'meals'->0 as primeira_refeicao
FROM v3_diet_templates
WHERE active = true
  AND plan_snapshot->'1500' IS NOT NULL
LIMIT 1;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ✅ RESULTADO ESPERADO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- Query 1: JSON com array de 7 dias
-- Query 2: total_ativos = 3, com_snapshot = 3
-- Query 3: JSON com name, foods, image
--
-- SE Query 1 retornar NULL ou vazio:
--   → Templates não têm dados, precisa executar TEMPLATES_7_DIAS_URGENTE.sql
--
-- SE Query 3 retornar NULL:
--   → Estrutura está errada, precisa corrigir
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ME ENVIE O RESULTADO DESTAS 3 QUERIES!
