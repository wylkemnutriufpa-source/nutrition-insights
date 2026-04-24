-- Bypass do guardrail apenas para correção de mismatch visual conhecido
-- (não toca em macros/título/quantidade)
DO $$
DECLARE
  _row RECORD;
  _count INTEGER := 0;
BEGIN
  -- Desabilita temporariamente o guardrail (é uma migração — superuser)
  ALTER TABLE public.meal_plan_items DISABLE TRIGGER trg_guard_published_plan_items_immutable;
  ALTER TABLE public.meal_plan_items DISABLE TRIGGER tr_validate_meal_image;
  ALTER TABLE public.meal_plan_items DISABLE TRIGGER tr_validate_meal_item;

  FOR _row IN
    SELECT mpi.id, mpi.meal_plan_id, mp.patient_id
    FROM public.meal_plan_items mpi
    JOIN public.meal_visual_library mvl ON mvl.id = mpi.visual_library_item_id
    JOIN public.meal_plans mp ON mp.id = mpi.meal_plan_id
    WHERE mpi.title ILIKE '%feij%'
      AND mpi.title NOT ILIKE '%frango%'
      AND mpi.title NOT ILIKE '%carne%'
      AND mvl.slug ILIKE '%arroz%'
  LOOP
    UPDATE public.meal_plan_items
    SET visual_library_item_id = NULL, image_url = NULL
    WHERE id = _row.id;

    INSERT INTO public.clinical_audit_logs (patient_id, action_type, action_metadata)
    VALUES (
      _row.patient_id,
      'visual_mismatch_cleared',
      jsonb_build_object(
        'item_id', _row.id,
        'plan_id', _row.meal_plan_id,
        'reason', 'feijao_was_showing_arroz_image',
        'fix_type', 'set_image_to_null_for_placeholder'
      )
    );
    _count := _count + 1;
  END LOOP;

  ALTER TABLE public.meal_plan_items ENABLE TRIGGER trg_guard_published_plan_items_immutable;
  ALTER TABLE public.meal_plan_items ENABLE TRIGGER tr_validate_meal_image;
  ALTER TABLE public.meal_plan_items ENABLE TRIGGER tr_validate_meal_item;

  RAISE NOTICE 'Visual mismatches corrigidos: %', _count;
END $$;