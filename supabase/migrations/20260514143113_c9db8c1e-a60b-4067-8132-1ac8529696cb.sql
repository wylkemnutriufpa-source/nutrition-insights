-- 1. Limpeza de itens proibidos no café da manhã para as pacientes afetadas
DELETE FROM public.meal_plan_items
WHERE meal_plan_id IN (
  'b81751a3-d4af-4393-8065-774ba40ad3dc', -- Luciana
  '590514be-0664-422f-8420-cf20db83816a'  -- Débora
)
AND meal_type = 'breakfast'
AND (
  title ILIKE '%arroz%' 
  OR title ILIKE '%feijão%' 
  OR title ILIKE '%tilápia%' 
  OR title ILIKE '%patinho%' 
  OR title ILIKE '%frango grelhado%'
);

-- 2. Correção da distribuição semanal para o plano da Luciana
WITH primary_items AS (
    SELECT id, 
           meal_type,
           ROW_NUMBER() OVER(PARTITION BY meal_type ORDER BY id) as row_num,
           (COUNT(*) OVER(PARTITION BY meal_type)) / 7 as items_per_day
    FROM public.meal_plan_items
    WHERE meal_plan_id = 'b81751a3-d4af-4393-8065-774ba40ad3dc'
    AND is_primary = true
),
day_mapping AS (
    SELECT id,
           CASE 
               WHEN items_per_day = 0 THEN 1 -- Fallback se houver menos de 7 itens
               WHEN (row_num - 1) / items_per_day = 0 THEN 1
               WHEN (row_num - 1) / items_per_day = 1 THEN 2
               WHEN (row_num - 1) / items_per_day = 2 THEN 3
               WHEN (row_num - 1) / items_per_day = 3 THEN 4
               WHEN (row_num - 1) / items_per_day = 4 THEN 5
               WHEN (row_num - 1) / items_per_day = 5 THEN 6
               ELSE 0
           END as assigned_day
    FROM primary_items
)
UPDATE public.meal_plan_items t
SET day_of_week = d.assigned_day
FROM day_mapping d
WHERE t.id = d.id;

-- 3. Propagar day_of_week para as substituições da Luciana
UPDATE public.meal_plan_items t
SET day_of_week = p.day_of_week
FROM public.meal_plan_items p
WHERE t.meal_plan_id = 'b81751a3-d4af-4393-8065-774ba40ad3dc'
AND t.is_primary = false
AND t.substitution_group_id = p.substitution_group_id
AND p.is_primary = true;

-- 4. Repetir para o plano da Débora
WITH primary_items AS (
    SELECT id, 
           meal_type,
           ROW_NUMBER() OVER(PARTITION BY meal_type ORDER BY id) as row_num,
           (COUNT(*) OVER(PARTITION BY meal_type)) / 7 as items_per_day
    FROM public.meal_plan_items
    WHERE meal_plan_id = '590514be-0664-422f-8420-cf20db83816a'
    AND is_primary = true
),
day_mapping AS (
    SELECT id,
           CASE 
               WHEN items_per_day = 0 THEN 1
               WHEN (row_num - 1) / items_per_day = 0 THEN 1
               WHEN (row_num - 1) / items_per_day = 1 THEN 2
               WHEN (row_num - 1) / items_per_day = 2 THEN 3
               WHEN (row_num - 1) / items_per_day = 3 THEN 4
               WHEN (row_num - 1) / items_per_day = 4 THEN 5
               WHEN (row_num - 1) / items_per_day = 5 THEN 6
               ELSE 0
           END as assigned_day
    FROM primary_items
)
UPDATE public.meal_plan_items t
SET day_of_week = d.assigned_day
FROM day_mapping d
WHERE t.id = d.id;

UPDATE public.meal_plan_items t
SET day_of_week = p.day_of_week
FROM public.meal_plan_items p
WHERE t.meal_plan_id = '590514be-0664-422f-8420-cf20db83816a'
AND t.is_primary = false
AND t.substitution_group_id = p.substitution_group_id
AND p.is_primary = true;