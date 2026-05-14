
-- ============================================================
-- 0) SNAPSHOT DE BACKUP (rollback completo a qualquer momento)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meal_plans_backup_20260514 AS
  SELECT * FROM public.meal_plans;

CREATE TABLE IF NOT EXISTS public.meal_plan_items_backup_20260514 AS
  SELECT * FROM public.meal_plan_items;

-- ============================================================
-- 1) ARQUIVAR planos vazios + completamente corrompidos
-- ============================================================
WITH plan_stats AS (
  SELECT mp.id,
         COUNT(mpi.id) AS items,
         COUNT(*) FILTER (WHERE mpi.day_of_week IS NULL) AS null_dow
  FROM public.meal_plans mp
  LEFT JOIN public.meal_plan_items mpi ON mpi.meal_plan_id = mp.id
  GROUP BY mp.id
),
to_archive AS (
  SELECT id FROM plan_stats
  WHERE items = 0 OR (items > 0 AND null_dow = items)
)
UPDATE public.meal_plans mp
SET is_active = false,
    plan_status = 'archived'
FROM to_archive ta
WHERE mp.id = ta.id
  AND mp.plan_status <> 'archived';

-- 1b) Limpar itens órfãos (NULL day_of_week) APENAS de planos arquivados
DELETE FROM public.meal_plan_items mpi
USING public.meal_plans mp
WHERE mpi.meal_plan_id = mp.id
  AND mp.plan_status = 'archived'
  AND mpi.day_of_week IS NULL;

-- ============================================================
-- 2) DEDUPE em planos saudáveis (mantém mais antigo de cada grupo)
-- ============================================================
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY meal_plan_id, day_of_week, meal_type, title,
                        COALESCE(substitution_group_id::text, '')
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.meal_plan_items
  WHERE day_of_week IS NOT NULL
)
DELETE FROM public.meal_plan_items
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ============================================================
-- 3) Verificação final: nenhum NULL day_of_week deve restar
-- ============================================================
DO $$
DECLARE
  remaining_null INT;
BEGIN
  SELECT COUNT(*) INTO remaining_null
  FROM public.meal_plan_items WHERE day_of_week IS NULL;
  IF remaining_null > 0 THEN
    RAISE NOTICE 'Itens NULL restantes (de planos não-arquivados): %', remaining_null;
    -- arquiva qualquer plano que ainda tenha NULL para garantir constraint
    UPDATE public.meal_plans
    SET is_active = false, plan_status = 'archived'
    WHERE id IN (
      SELECT DISTINCT meal_plan_id FROM public.meal_plan_items WHERE day_of_week IS NULL
    );
    DELETE FROM public.meal_plan_items WHERE day_of_week IS NULL;
  END IF;
END $$;

-- ============================================================
-- 4) HARDENING: NOT NULL + UNIQUE INDEX
-- ============================================================
ALTER TABLE public.meal_plan_items
  ALTER COLUMN day_of_week SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS meal_plan_items_uniq_slot
  ON public.meal_plan_items (
    meal_plan_id,
    day_of_week,
    meal_type,
    title,
    COALESCE(substitution_group_id::text, '')
  );
