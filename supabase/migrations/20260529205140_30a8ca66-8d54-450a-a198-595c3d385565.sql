-- Etapa A: Contrato canônico quantity_display
-- Adiciona coluna nativa em meal_plan_items espelhando o nome do snapshot V3.
-- Coluna NULLABLE nesta etapa (histórico ainda não preenchido). NOT NULL fica para Etapa B.

ALTER TABLE public.meal_plan_items
  ADD COLUMN IF NOT EXISTS quantity_display text;

COMMENT ON COLUMN public.meal_plan_items.quantity_display IS
  'Fonte canônica de quantidade humana do item (ex: "2 unidades", "150g"). Espelha snapshot V3.';

-- Índice parcial para auditoria de itens órfãos (planos novos não devem cair aqui).
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_quantity_display_null
  ON public.meal_plan_items (meal_plan_id)
  WHERE quantity_display IS NULL;

-- RPC publish_meal_plan_v3: passa a persistir quantity_display e valida ausência (MISSING_QUANTITY_DISPLAY).
CREATE OR REPLACE FUNCTION public.publish_meal_plan_v3(
  p_plan_id uuid,
  p_patient_id uuid,
  p_nutritionist_id uuid,
  p_tenant_id uuid,
  p_payload jsonb,
  p_items jsonb,
  p_draft_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_final_plan_id UUID;
  v_item_count INT;
  v_missing INT;
BEGIN
  -- 1. Bloquear planos vazios
  v_item_count := jsonb_array_length(p_items);
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'CANNOT_PUBLISH_EMPTY_PLAN';
  END IF;

  -- 1.1 CONTRATO V3: todo item DEVE trazer quantity_display textual não vazio.
  SELECT count(*) INTO v_missing
  FROM jsonb_array_elements(p_items) AS item
  WHERE coalesce(nullif(trim(item->>'quantity_display'), ''), '') = '';

  IF v_missing > 0 THEN
    RAISE EXCEPTION 'MISSING_QUANTITY_DISPLAY: % itens sem quantity_display', v_missing;
  END IF;

  -- 2. Arquivar planos ativos anteriores
  UPDATE public.meal_plans
  SET is_active = false,
      plan_status = 'archived'
  WHERE patient_id = p_patient_id
    AND is_active = true
    AND id != COALESCE(p_plan_id, '00000000-0000-0000-0000-000000000000'::UUID);

  -- 3. Persistência do Plano
  IF p_plan_id IS NOT NULL THEN
    UPDATE public.meal_plans
    SET
      patient_id = p_patient_id,
      nutritionist_id = p_nutritionist_id,
      tenant_id = p_tenant_id,
      title = p_payload->>'title',
      snapshot = p_payload->'snapshot',
      total_meta_calorias = (p_payload->>'total_meta_calorias')::NUMERIC,
      total_meta_proteinas = (p_payload->>'total_meta_proteinas')::NUMERIC,
      total_meta_carboidratos = (p_payload->>'total_meta_carboidratos')::NUMERIC,
      total_meta_gorduras = (p_payload->>'total_meta_gorduras')::NUMERIC,
      plan_status = 'published_to_patient',
      is_active = true,
      plan_mode = (COALESCE(p_payload->>'plan_mode', 'weekly'))::public.plan_mode_type,
      editor_version = 'v3',
      start_date = (COALESCE(p_payload->>'start_date', NOW()::text))::DATE,
      updated_at = NOW()
    WHERE id = p_plan_id;
    v_final_plan_id := p_plan_id;
  ELSE
    INSERT INTO public.meal_plans (
      patient_id, nutritionist_id, tenant_id, title, snapshot,
      total_meta_calorias, total_meta_proteinas, total_meta_carboidratos, total_meta_gorduras,
      plan_status, is_active, plan_mode, editor_version, start_date
    ) VALUES (
      p_patient_id, p_nutritionist_id, p_tenant_id,
      p_payload->>'title',
      p_payload->'snapshot',
      (p_payload->>'total_meta_calorias')::NUMERIC,
      (p_payload->>'total_meta_proteinas')::NUMERIC,
      (p_payload->>'total_meta_carboidratos')::NUMERIC,
      (p_payload->>'total_meta_gorduras')::NUMERIC,
      'published_to_patient',
      true,
      (COALESCE(p_payload->>'plan_mode', 'weekly'))::public.plan_mode_type,
      'v3',
      (COALESCE(p_payload->>'start_date', NOW()::text))::DATE
    ) RETURNING id INTO v_final_plan_id;
  END IF;

  -- 4. Sincronismo de Itens
  DELETE FROM public.meal_plan_items WHERE meal_plan_id = v_final_plan_id;

  INSERT INTO public.meal_plan_items (
    meal_plan_id, tenant_id, tipo_refeicao, day_of_week, title,
    description, meta_calorias, meta_proteinas, meta_carboidratos,
    meta_gorduras, image_url, is_primary, substitution_group_id, editor_version, clinical_mass_g,
    quantity_display
  )
  SELECT
    v_final_plan_id,
    p_tenant_id,
    (item->>'tipo_refeicao'),
    (item->>'day_of_week')::INT,
    (item->>'title'),
    (item->>'description'),
    (item->>'meta_calorias')::NUMERIC,
    (item->>'meta_proteinas')::NUMERIC,
    (item->>'meta_carboidratos')::NUMERIC,
    (item->>'meta_gorduras')::NUMERIC,
    (item->>'image_url'),
    (item->>'is_primary')::BOOLEAN,
    (item->>'substitution_group_id')::UUID,
    'v3',
    (item->>'clinical_mass_g')::NUMERIC,
    (item->>'quantity_display')
  FROM jsonb_array_elements(p_items) AS item;

  -- 5. Promoção do Draft
  IF p_draft_id IS NOT NULL THEN
    UPDATE public.v3_drafts
    SET
      draft_status = 'promoted',
      promoted_meal_plan_id = v_final_plan_id,
      promoted_at = NOW(),
      updated_at = NOW()
    WHERE id = p_draft_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'plan_id', v_final_plan_id);
END;
$function$;