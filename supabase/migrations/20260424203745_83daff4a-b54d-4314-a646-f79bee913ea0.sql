-- =====================================================================
-- TRAVA SISTÊMICA PARA PLANOS "1 DIA + SUBSTITUIÇÕES" (single_day)
-- =====================================================================

-- 1) Garantir colunas de auditoria adicionais em single_day_sync_logs
ALTER TABLE public.single_day_sync_logs
  ADD COLUMN IF NOT EXISTS items_moved INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items_converted_to_substitution INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items_removed INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS triggered_by TEXT DEFAULT 'system';

-- 2) Função de normalização — converte itens day≠0 em substituições no day=0
CREATE OR REPLACE FUNCTION public.enforce_single_day_normalization(p_plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode text;
  rec RECORD;
  v_primary_id uuid;
  v_moved INT := 0;
  v_converted INT := 0;
  v_removed INT := 0;
BEGIN
  SELECT plan_mode::text INTO v_mode FROM public.meal_plans WHERE id = p_plan_id;
  IF v_mode IS DISTINCT FROM 'single_day' THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'not_single_day', 'mode', v_mode);
  END IF;

  -- Bypass de triggers de imutabilidade nesta sessão
  PERFORM set_config('session_replication_role', 'replica', true);

  FOR rec IN
    SELECT id, meal_type, is_primary
    FROM public.meal_plan_items
    WHERE meal_plan_id = p_plan_id
      AND day_of_week <> 0
    ORDER BY day_of_week, meal_type
  LOOP
    SELECT id INTO v_primary_id
    FROM public.meal_plan_items
    WHERE meal_plan_id = p_plan_id
      AND day_of_week = 0
      AND meal_type = rec.meal_type
      AND is_primary = true
    LIMIT 1;

    IF v_primary_id IS NOT NULL THEN
      UPDATE public.meal_plan_items
      SET day_of_week = 0,
          is_primary = false,
          substitution_group_id = COALESCE(substitution_group_id, v_primary_id),
          master_item_id = COALESCE(master_item_id, v_primary_id)
      WHERE id = rec.id;

      UPDATE public.meal_plan_items
      SET substitution_group_id = COALESCE(substitution_group_id, v_primary_id)
      WHERE id = v_primary_id;

      v_moved := v_moved + 1;
      v_converted := v_converted + 1;
    ELSE
      -- sem primária: promove a primeira do meal_type a primária em day=0
      IF rec.is_primary THEN
        UPDATE public.meal_plan_items
        SET day_of_week = 0
        WHERE id = rec.id;
        v_moved := v_moved + 1;
      ELSE
        DELETE FROM public.meal_plan_items WHERE id = rec.id;
        v_removed := v_removed + 1;
      END IF;
    END IF;
  END LOOP;

  -- Restaura modo de replicação
  PERFORM set_config('session_replication_role', 'origin', true);

  -- Auditoria
  BEGIN
    INSERT INTO public.single_day_sync_logs (
      meal_plan_id, status, items_moved, items_converted_to_substitution, items_removed, triggered_by, payload
    ) VALUES (
      p_plan_id, 'ok', v_moved, v_converted, v_removed, 'enforce_single_day_normalization',
      jsonb_build_object('moved', v_moved, 'converted', v_converted, 'removed', v_removed)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'enforce_single_day_normalization audit failed: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'plan_id', p_plan_id,
    'moved', v_moved,
    'converted_to_substitution', v_converted,
    'removed', v_removed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.enforce_single_day_normalization(uuid) TO authenticated;

-- 3) Trigger: força day_of_week=0 em qualquer INSERT/UPDATE quando plano é single_day
CREATE OR REPLACE FUNCTION public.fn_force_day_zero_on_single_day()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode text;
BEGIN
  SELECT plan_mode::text INTO v_mode FROM public.meal_plans WHERE id = NEW.meal_plan_id;
  IF v_mode = 'single_day' AND COALESCE(NEW.day_of_week, 0) <> 0 THEN
    NEW.day_of_week := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_force_day_zero_on_single_day ON public.meal_plan_items;
CREATE TRIGGER tr_force_day_zero_on_single_day
BEFORE INSERT OR UPDATE OF day_of_week ON public.meal_plan_items
FOR EACH ROW EXECUTE FUNCTION public.fn_force_day_zero_on_single_day();

-- 4) Trigger: ao mudar plan_mode para single_day, normaliza automaticamente
CREATE OR REPLACE FUNCTION public.fn_enforce_single_day_on_mode_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plan_mode::text = 'single_day'
     AND (TG_OP = 'INSERT' OR OLD.plan_mode::text IS DISTINCT FROM 'single_day') THEN
    PERFORM public.enforce_single_day_normalization(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_enforce_single_day_on_mode_change ON public.meal_plans;
CREATE TRIGGER tr_enforce_single_day_on_mode_change
AFTER INSERT OR UPDATE OF plan_mode ON public.meal_plans
FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_single_day_on_mode_change();

-- 5) Validador global (somente leitura) — devolve planos single_day com problema
CREATE OR REPLACE FUNCTION public.validate_all_single_day_plans()
RETURNS TABLE(
  plan_id uuid,
  plan_title text,
  issue text,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Itens em dia diferente de 0
  SELECT mp.id, mp.title, 'items_in_non_zero_day'::text,
         jsonb_build_object('count', COUNT(i.id))
  FROM public.meal_plans mp
  JOIN public.meal_plan_items i ON i.meal_plan_id = mp.id
  WHERE mp.plan_mode = 'single_day' AND i.day_of_week <> 0
  GROUP BY mp.id, mp.title
  HAVING COUNT(i.id) > 0

  UNION ALL

  -- Substituição sem master_item_id
  SELECT mp.id, mp.title, 'substitution_without_master'::text,
         jsonb_build_object('count', COUNT(i.id))
  FROM public.meal_plans mp
  JOIN public.meal_plan_items i ON i.meal_plan_id = mp.id
  WHERE mp.plan_mode = 'single_day'
    AND i.is_primary = false
    AND i.master_item_id IS NULL
  GROUP BY mp.id, mp.title
  HAVING COUNT(i.id) > 0

  UNION ALL

  -- Meal_type sem nenhuma primária em day=0
  SELECT mp.id, mp.title, 'meal_type_without_primary'::text,
         jsonb_build_object('meal_type', i.meal_type)
  FROM public.meal_plans mp
  JOIN public.meal_plan_items i ON i.meal_plan_id = mp.id
  WHERE mp.plan_mode = 'single_day'
  GROUP BY mp.id, mp.title, i.meal_type
  HAVING SUM(CASE WHEN i.day_of_week = 0 AND i.is_primary = true THEN 1 ELSE 0 END) = 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_all_single_day_plans() TO authenticated;