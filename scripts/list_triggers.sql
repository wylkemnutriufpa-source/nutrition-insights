-- Script para listar triggers ativos em meal_plan_items e meal_plans
-- Exibe: Nome do Trigger, Tabela, Função, Eventos, Timing e Definição
-- Inclui colunas afetadas (para UPDATE triggers)

SELECT 
    trg.tgname AS trigger_name,
    rel.relname AS table_name,
    proc.proname AS function_name,
    CASE trg.tgtype::integer & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER' END AS timing,
    CASE trg.tgtype::integer & 4 WHEN 4 THEN 'INSERT ' ELSE '' END ||
    CASE trg.tgtype::integer & 8 WHEN 8 THEN 'DELETE ' ELSE '' END ||
    CASE trg.tgtype::integer & 16 WHEN 16 THEN 'UPDATE ' ELSE '' END AS events,
    pg_get_triggerdef(trg.oid) AS full_definition
FROM pg_trigger trg
JOIN pg_class rel ON trg.tgrelid = rel.oid
JOIN pg_proc proc ON trg.tgfoid = proc.oid
JOIN pg_namespace nsp ON rel.relnamespace = nsp.oid
WHERE rel.relname IN ('meal_plans', 'meal_plan_items')
AND nsp.nspname = 'public'
AND trg.tgisinternal = false
ORDER BY rel.relname, trg.tgname;
