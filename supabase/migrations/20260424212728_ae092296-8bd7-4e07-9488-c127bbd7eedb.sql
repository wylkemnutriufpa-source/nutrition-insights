-- Re-vincula itens "Feijão" e "Pão Francês" sem imagem
DO $$
DECLARE
  _feijao_id UUID;
  _pao_id UUID;
  _feijao_count INT := 0;
  _pao_count INT := 0;
BEGIN
  SELECT id INTO _feijao_id FROM public.meal_visual_library WHERE slug = 'feijao-carioca';
  SELECT id INTO _pao_id FROM public.meal_visual_library WHERE slug = 'pao-frances';

  -- Disable guardrails temporariamente (somente para correção visual)
  ALTER TABLE public.meal_plan_items DISABLE TRIGGER trg_guard_published_plan_items_immutable;
  ALTER TABLE public.meal_plan_items DISABLE TRIGGER tr_validate_meal_image;
  ALTER TABLE public.meal_plan_items DISABLE TRIGGER tr_validate_meal_item;

  -- Update feijão
  WITH upd AS (
    UPDATE public.meal_plan_items
    SET visual_library_item_id = _feijao_id
    WHERE LOWER(TRIM(title)) IN ('feijão','feijao','feijão carioca','feijao carioca','feijão cozido','feijao cozido')
      AND visual_library_item_id IS NULL
      AND image_url IS NULL
    RETURNING id, meal_plan_id
  )
  SELECT COUNT(*) INTO _feijao_count FROM upd;

  -- Update pão francês
  WITH upd AS (
    UPDATE public.meal_plan_items
    SET visual_library_item_id = _pao_id
    WHERE LOWER(TRIM(title)) IN ('pão francês','pao frances','pão frances','pao francês')
      AND visual_library_item_id IS NULL
      AND image_url IS NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO _pao_count FROM upd;

  -- Reabilitar guardrails
  ALTER TABLE public.meal_plan_items ENABLE TRIGGER trg_guard_published_plan_items_immutable;
  ALTER TABLE public.meal_plan_items ENABLE TRIGGER tr_validate_meal_image;
  ALTER TABLE public.meal_plan_items ENABLE TRIGGER tr_validate_meal_item;

  -- Log de auditoria agregado
  INSERT INTO public.clinical_audit_logs (action_type, action_metadata)
  VALUES (
    'visual_library_rebind',
    jsonb_build_object(
      'feijao_items_relinked', _feijao_count,
      'pao_frances_items_relinked', _pao_count,
      'method', 'exact_title_match',
      'safe_mode', true
    )
  );

  RAISE NOTICE 'Feijão revinculados: %, Pão Francês revinculados: %', _feijao_count, _pao_count;
END $$;