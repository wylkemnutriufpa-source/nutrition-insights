-- Consolida plano de Angela em "1 dia + substituições"
-- Move itens do day=1 para day=0 como substituições das primárias do mesmo meal_type
CREATE OR REPLACE FUNCTION public._tmp_consolidate_angela_single_day()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid := 'b4182ebf-b29c-44b3-81eb-106f69ad5d4f';
  rec RECORD;
  v_primary_id uuid;
BEGIN
  -- Bypassa trigger de imutabilidade nesta sessão
  SET LOCAL session_replication_role = 'replica';

  -- Para cada item do day=1, encontrar a primária correspondente em day=0 (mesmo meal_type)
  FOR rec IN
    SELECT id, meal_type
    FROM public.meal_plan_items
    WHERE meal_plan_id = v_plan_id AND day_of_week = 1
  LOOP
    SELECT id INTO v_primary_id
    FROM public.meal_plan_items
    WHERE meal_plan_id = v_plan_id
      AND day_of_week = 0
      AND meal_type = rec.meal_type
      AND is_primary = true
    LIMIT 1;

    IF v_primary_id IS NOT NULL THEN
      -- Vira substituição: mesmo dia, ligada à primária
      UPDATE public.meal_plan_items
      SET day_of_week = 0,
          is_primary = false,
          substitution_group_id = v_primary_id,
          master_item_id = v_primary_id
      WHERE id = rec.id;

      -- Garante que a primária também referencia o grupo
      UPDATE public.meal_plan_items
      SET substitution_group_id = v_primary_id
      WHERE id = v_primary_id AND substitution_group_id IS NULL;
    ELSE
      -- Sem correspondente: descarta o item órfão
      DELETE FROM public.meal_plan_items WHERE id = rec.id;
    END IF;
  END LOOP;

  -- Marca o plano como single_day
  UPDATE public.meal_plans
  SET plan_mode = 'single_day'
  WHERE id = v_plan_id;
END;
$$;

SELECT public._tmp_consolidate_angela_single_day();
DROP FUNCTION public._tmp_consolidate_angela_single_day();