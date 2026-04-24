-- 1. Remover trigger que sobrescreve macros
DROP TRIGGER IF EXISTS trg_sync_meal_plan_item_targets ON public.meal_plan_items;

-- 2. Remover função associada
DROP FUNCTION IF EXISTS public.fn_sync_meal_plan_item_targets();
