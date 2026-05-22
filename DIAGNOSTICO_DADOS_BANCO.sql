-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🔍 DIAGNÓSTICO COMPLETO - TEMPLATES NO BANCO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Execute este SQL no Supabase para verificar se os dados estão corretos
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1️⃣ VERIFICAR TEMPLATES ATIVOS
-- Deve retornar 3 templates (Colesterol Alto 1600, Emagrecimento 1500, Emagrecimento 1200)
SELECT 
  title,
  family,
  kcal,
  active,
  sovereign_validated,
  created_at
FROM v3_diet_templates
WHERE active = true
ORDER BY created_at DESC;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 2️⃣ VERIFICAR ESTRUTURA DO EMAGRECIMENTO 1500 KCAL
-- Deve retornar 7 dias com refeições completas
SELECT 
  title,
  jsonb_array_length(plan_snapshot->'1500') as total_dias,
  plan_snapshot->'1500'->0->'day' as dia_1,
  jsonb_array_length(plan_snapshot->'1500'->0->'meals') as refeicoes_dia_1
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 3️⃣ VERIFICAR PRIMEIRA REFEIÇÃO DO DIA 1 (CUSCUZ COM OVO)
-- Deve retornar: name="Cuscuz com Ovo", foods=[{name:"Cuscuz",qty:"100g",kcal:112}, ...]
SELECT 
  title,
  plan_snapshot->'1500'->0->'meals'->0 as primeira_refeicao
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 4️⃣ VERIFICAR TODOS OS 7 DIAS DO EMAGRECIMENTO 1500 KCAL
-- Deve retornar 7 linhas com dias diferentes (Segunda, Terça, Quarta, etc)
SELECT 
  title,
  idx as dia_numero,
  day_data->>'day' as dia_semana,
  jsonb_array_length(day_data->'meals') as total_refeicoes,
  day_data->'meals'->0->>'name' as cafe_da_manha
FROM v3_diet_templates,
  jsonb_array_elements(plan_snapshot->'1500') WITH ORDINALITY AS t(day_data, idx)
WHERE title = 'Emagrecimento 1500 kcal'
ORDER BY idx;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 5️⃣ VERIFICAR ALIMENTOS DA PRIMEIRA REFEIÇÃO (FOODS)
-- Deve retornar: Cuscuz 100g 112kcal, Ovo 2 unidades 146kcal, Mamão 1 fatia 43kcal
SELECT 
  title,
  food_data->>'name' as alimento,
  food_data->>'qty' as quantidade,
  (food_data->>'kcal')::int as calorias
FROM v3_diet_templates,
  jsonb_array_elements(plan_snapshot->'1500'->0->'meals'->0->'foods') AS food_data
WHERE title = 'Emagrecimento 1500 kcal';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 6️⃣ VERIFICAR IMAGENS DAS REFEIÇÕES
-- Deve retornar URLs válidas (https://...supabase.co/storage/.../cuscuz-com-ovo.jpg)
SELECT 
  title,
  meal_data->>'name' as refeicao,
  meal_data->>'image' as imagem_url
FROM v3_diet_templates,
  jsonb_array_elements(plan_snapshot->'1500'->0->'meals') AS meal_data
WHERE title = 'Emagrecimento 1500 kcal';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 7️⃣ VERIFICAR TOTAL DE CALORIAS DO DIA 1
-- Deve retornar aproximadamente 1500 kcal
SELECT 
  title,
  SUM((food_data->>'kcal')::int) as total_calorias_dia_1
FROM v3_diet_templates,
  jsonb_array_elements(plan_snapshot->'1500'->0->'meals') AS meal_data,
  jsonb_array_elements(meal_data->'foods') AS food_data
WHERE title = 'Emagrecimento 1500 kcal'
GROUP BY title;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 8️⃣ VERIFICAR TEMPLATES INATIVOS (DEVEM SER 50)
-- Estes são os templates contaminados que foram desativados
SELECT 
  COUNT(*) as templates_inativos,
  COUNT(*) FILTER (WHERE sovereign_validated = false) as nao_validados
FROM v3_diet_templates
WHERE active = false;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 9️⃣ VERIFICAR TODOS OS 3 TEMPLATES PRIORITÁRIOS
-- Deve retornar 3 linhas com 7 dias cada
SELECT 
  title,
  family,
  kcal,
  jsonb_array_length(plan_snapshot->(kcal::text)) as total_dias,
  plan_snapshot->(kcal::text)->0->'meals'->0->>'name' as cafe_dia_1,
  plan_snapshot->(kcal::text)->6->'meals'->0->>'name' as cafe_dia_7
FROM v3_diet_templates
WHERE active = true
ORDER BY family, kcal;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ✅ RESULTADO ESPERADO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- Query 1: 3 templates ativos
-- Query 2: 7 dias, 6 refeições no dia 1
-- Query 3: JSON com name="Cuscuz com Ovo", foods=[...]
-- Query 4: 7 linhas (Segunda a Domingo) com cafés diferentes
-- Query 5: 3 alimentos (Cuscuz, Ovo, Mamão) com quantidades
-- Query 6: 6 URLs de imagens válidas
-- Query 7: ~1500 kcal
-- Query 8: 50 templates inativos
-- Query 9: 3 templates com 7 dias cada, cafés diferentes no dia 1 e 7
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
