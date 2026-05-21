-- ✅ VERIFICAR TOTAL DE TEMPLATES POPULADOS
-- Execute este SQL no Supabase SQL Editor

-- Query 1: Resumo Geral
SELECT 
  COUNT(*) as total_templates,
  COUNT(*) FILTER (WHERE plan_snapshot IS NOT NULL AND plan_snapshot::text != '{}') as com_dados_completos,
  COUNT(*) FILTER (WHERE plan_snapshot IS NULL OR plan_snapshot::text = '{}') as vazios
FROM v3_diet_templates
WHERE active = true;

-- Query 2: Detalhes por Template
SELECT 
  id,
  title,
  slug,
  objective,
  CASE 
    WHEN plan_snapshot IS NULL THEN 'VAZIO'
    WHEN plan_snapshot::text = '{}' THEN 'VAZIO'
    ELSE 'COM DADOS'
  END as status,
  (SELECT COUNT(*) FROM jsonb_object_keys(plan_snapshot)) as qtd_perfis_caloricos
FROM v3_diet_templates
WHERE active = true
ORDER BY title;

-- Query 3: Verificar estrutura de um template específico (exemplo: 1500 kcal)
SELECT 
  title,
  jsonb_object_keys(plan_snapshot) as perfil_calorico
FROM v3_diet_templates
WHERE active = true 
  AND plan_snapshot IS NOT NULL
LIMIT 5;
