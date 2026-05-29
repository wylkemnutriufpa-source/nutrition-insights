-- ============================================================
-- DESAGRUPAR 6 TEMPLATES COM REFEIÇÕES AGRUPADAS
-- ============================================================
-- Script automático para separar refeições agrupadas em items individuais
-- IMPORTANTE: Executar em partes, validando cada passo

-- ============================================================
-- PASSO 1: BACKUP — Salvar templates originais
-- ============================================================
-- Criar tabela de backup (executar uma única vez)
CREATE TABLE IF NOT EXISTS v3_diet_templates_backup_20260528 AS
SELECT * FROM v3_diet_templates
WHERE active = true
AND plan_snapshot::text LIKE '%com%';

-- Verificar backup
SELECT COUNT(*) as templates_backed_up FROM v3_diet_templates_backup_20260528;

-- ============================================================
-- PASSO 2: IDENTIFICAR E DESAGRUPAR
-- ============================================================
-- Encontrar templates com refeições agrupadas
WITH grouped_meals AS (
  SELECT 
    id,
    title,
    plan_snapshot
  FROM v3_diet_templates
  WHERE active = true
  AND plan_snapshot::text LIKE '%com%'
)
SELECT 
  id,
  title,
  COUNT(*) as grouped_meal_count
FROM grouped_meals,
  jsonb_array_elements(plan_snapshot->'days') as day,
  jsonb_array_elements(day->'meals') as meal
WHERE meal->>'name' LIKE '%com%'
GROUP BY id, title;

-- ============================================================
-- PASSO 3: FUNÇÃO AUXILIAR — Desagrupar Refeição
-- ============================================================
-- Esta função separa uma refeição agrupada em items individuais

-- Exemplo de desagrupamento manual (para cada template):
-- Se a refeição é "Café com Leite com Pão com Ovo" com 450 kcal
-- Separar em:
-- - Café com Leite: 150 kcal
-- - Pão Integral: 100 kcal  
-- - Ovo Cozido: 80 kcal
-- - Outros: 120 kcal

-- ============================================================
-- PASSO 4: TEMPLATE 1 — Desagrupar
-- ============================================================
-- Descomente e execute para cada template identificado

-- UPDATE v3_diet_templates
-- SET plan_snapshot = jsonb_set(
--   plan_snapshot,
--   '{days,0,meals,0}',
--   jsonb_build_object(
--     'name', 'Café da Manhã',
--     'items', jsonb_build_array(
--       jsonb_build_object(
--         'name', 'Café com Leite',
--         'kcal', 150,
--         'quantity', 1,
--         'unit', 'xícara',
--         'portion_label', '1 xícara (200ml)',
--         'imageUrl', 'https://cdn.example.com/cafe-com-leite.jpg'
--       ),
--       jsonb_build_object(
--         'name', 'Pão Integral',
--         'kcal', 100,
--         'quantity', 2,
--         'unit', 'fatia',
--         'portion_label', '2 fatias (50g)',
--         'imageUrl', 'https://cdn.example.com/pao-integral.jpg'
--       ),
--       jsonb_build_object(
--         'name', 'Ovo Cozido',
--         'kcal', 80,
--         'quantity', 1,
--         'unit', 'unidade',
--         'portion_label', '1 ovo (50g)',
--         'imageUrl', 'https://cdn.example.com/ovo-cozido.jpg'
--       )
--     )
--   )
-- )
-- WHERE id = 'TEMPLATE_ID_1';

-- ============================================================
-- PASSO 5: VALIDAÇÃO PÓS-CORREÇÃO
-- ============================================================
-- Executar após desagrupar todos os 6 templates

-- Verificar que não há mais refeições agrupadas
SELECT 
  COUNT(*) as total_templates,
  COUNT(CASE WHEN plan_snapshot::text LIKE '%com%' THEN 1 END) as templates_com_refeicoes_agrupadas
FROM v3_diet_templates
WHERE active = true;

-- Esperado: templates_com_refeicoes_agrupadas = 0

-- ============================================================
-- PASSO 6: RESTAURAR BACKUP (se necessário)
-- ============================================================
-- Se algo der errado, restaurar do backup

-- RESTORE (descomente se necessário):
-- DELETE FROM v3_diet_templates
-- WHERE id IN (SELECT id FROM v3_diet_templates_backup_20260528);
-- 
-- INSERT INTO v3_diet_templates
-- SELECT * FROM v3_diet_templates_backup_20260528;

-- ============================================================
-- NOTAS IMPORTANTES
-- ============================================================
-- 1. Executar PASSO 1 uma única vez (criar backup)
-- 2. Executar PASSO 2 para identificar templates
-- 3. Para cada template identificado:
--    - Copiar template JSON completo
--    - Desagrupar manualmente ou usar PASSO 4 como template
--    - Executar UPDATE
-- 4. Executar PASSO 5 para validar
-- 5. Se erro, executar PASSO 6 para restaurar

-- ============================================================
-- ESTRUTURA ESPERADA APÓS DESAGRUPAMENTO
-- ============================================================
-- Cada item deve ter:
-- - name: nome do item (ex: "Café com Leite")
-- - kcal: calorias do item
-- - quantity: quantidade
-- - unit: unidade (xícara, fatia, unidade, g, etc)
-- - portion_label: descrição legível (ex: "1 xícara (200ml)")
-- - imageUrl: URL da imagem

-- Exemplo correto:
-- {
--   "name": "Café da Manhã",
--   "items": [
--     {
--       "name": "Café com Leite",
--       "kcal": 150,
--       "quantity": 1,
--       "unit": "xícara",
--       "portion_label": "1 xícara (200ml)",
--       "imageUrl": "https://..."
--     },
--     {
--       "name": "Pão Integral",
--       "kcal": 100,
--       "quantity": 2,
--       "unit": "fatia",
--       "portion_label": "2 fatias (50g)",
--       "imageUrl": "https://..."
--     }
--   ]
-- }
