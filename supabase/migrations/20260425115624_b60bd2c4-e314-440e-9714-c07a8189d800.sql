-- 1. Remover triggers de replicação
DROP TRIGGER IF EXISTS tr_sync_single_day_items_ins ON public.meal_plan_items;
DROP TRIGGER IF EXISTS tr_sync_single_day_items_upd ON public.meal_plan_items;
DROP TRIGGER IF EXISTS tr_sync_single_day_items_del ON public.meal_plan_items;
DROP TRIGGER IF EXISTS tr_force_day_zero_on_single_day ON public.meal_plan_items;
DROP TRIGGER IF EXISTS tr_enforce_single_day_on_mode_change ON public.meal_plans;

-- 2. Remover funções legadas
DROP FUNCTION IF EXISTS public.fn_sync_single_day_plan_items() CASCADE;
DROP FUNCTION IF EXISTS public.fn_force_day_zero_on_single_day() CASCADE;
DROP FUNCTION IF EXISTS public.fn_enforce_single_day_on_mode_change() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_single_day_normalization() CASCADE;
DROP FUNCTION IF EXISTS public.validate_single_day_consistency(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.validate_all_single_day_plans() CASCADE;
DROP FUNCTION IF EXISTS public.repair_single_day_plan(uuid) CASCADE;

-- 3. Limpar dados de réplicas (dias 1-6 são obsoletos)
DELETE FROM public.meal_plan_items WHERE day_of_week IS NOT NULL AND day_of_week BETWEEN 1 AND 6;

-- 4. Remover constraint de FK e coluna master_item_id
ALTER TABLE public.meal_plan_items DROP CONSTRAINT IF EXISTS meal_plan_items_master_item_id_fkey;
ALTER TABLE public.meal_plan_items DROP COLUMN IF EXISTS master_item_id;

-- 5. Garantir que todos os items tenham day_of_week = 0
UPDATE public.meal_plan_items SET day_of_week = 0 WHERE day_of_week IS NULL OR day_of_week <> 0;

-- 6. Criar trigger simples para forçar day_of_week = 0 sempre
CREATE OR REPLACE FUNCTION public.fn_force_day_zero_simple()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Modelo single-day: todo item vai para o dia mestre (0)
  NEW.day_of_week := 0;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_force_day_zero_simple
BEFORE INSERT OR UPDATE OF day_of_week ON public.meal_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_force_day_zero_simple();

-- 7. Adicionar constraint para garantir day_of_week = 0
ALTER TABLE public.meal_plan_items DROP CONSTRAINT IF EXISTS meal_plan_items_day_zero_only;
ALTER TABLE public.meal_plan_items 
  ADD CONSTRAINT meal_plan_items_day_zero_only CHECK (day_of_week = 0);