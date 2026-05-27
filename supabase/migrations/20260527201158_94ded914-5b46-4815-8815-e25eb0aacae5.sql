CREATE OR REPLACE FUNCTION public.publish_meal_plan_v3(
  p_plan_id UUID,
  p_patient_id UUID,
  p_nutritionist_id UUID,
  p_tenant_id UUID,
  p_payload JSONB,
  p_items JSONB,
  p_draft_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_final_plan_id UUID;
  v_item_count INT;
BEGIN
  -- 1. Validação de segurança: Bloquear planos vazios
  v_item_count := jsonb_array_length(p_items);
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'CANNOT_PUBLISH_EMPTY_PLAN';
  END IF;

  -- 2. Arquivar planos ativos anteriores (Atomicamente)
  UPDATE public.meal_plans
  SET is_active = false,
      plan_status = 'archived'
  WHERE patient_id = p_patient_id
    AND is_active = true
    AND id != COALESCE(p_plan_id, '00000000-0000-0000-0000-000000000000'::UUID);

  -- 3. Persistência do Plano (Update ou Insert)
  IF p_plan_id IS NOT NULL THEN
    UPDATE public.meal_plans
    SET 
      patient_id = p_patient_id,
      nutritionist_id = p_nutritionist_id,
      tenant_id = p_tenant_id,
      title = p_payload->>'title',
      snapshot = p_payload->'snapshot',
      total_meta_calorias = (p_payload->>'total_meta_calorias')::INT,
      total_meta_proteinas = (p_payload->>'total_meta_proteinas')::INT,
      total_meta_carboidratos = (p_payload->>'total_meta_carboidratos')::INT,
      total_meta_gorduras = (p_payload->>'total_meta_gorduras')::INT,
      plan_status = 'published_to_patient',
      is_active = true,
      plan_mode = p_payload->>'plan_mode',
      editor_version = 'v3',
      start_date = (p_payload->>'start_date')::DATE,
      updated_at = NOW()
    WHERE id = p_plan_id;
    
    v_final_plan_id := p_plan_id;
  ELSE
    INSERT INTO public.meal_plans (
      patient_id, nutritionist_id, tenant_id, title, snapshot,
      total_meta_calorias, total_meta_proteinas, total_meta_carboidratos, total_meta_gorduras,
      plan_status, is_active, plan_mode, editor_version, start_date
    ) VALUES (
      p_patient_id,
      p_nutritionist_id,
      p_tenant_id,
      p_payload->>'title',
      p_payload->'snapshot',
      (p_payload->>'total_meta_calorias')::INT,
      (p_payload->>'total_meta_proteinas')::INT,
      (p_payload->>'total_meta_carboidratos')::INT,
      (p_payload->>'total_meta_gorduras')::INT,
      'published_to_patient',
      true,
      p_payload->>'plan_mode',
      'v3',
      (p_payload->>'start_date')::DATE
    ) RETURNING id INTO v_final_plan_id;
  END IF;

  -- 4. Sincronismo de Itens (Idempotência: Deletar existentes e re-inserir na mesma transação)
  DELETE FROM public.meal_plan_items WHERE meal_plan_id = v_final_plan_id;

  INSERT INTO public.meal_plan_items (
    meal_plan_id, tenant_id, tipo_refeicao, day_of_week, title, 
    description, meta_calorias, meta_proteinas, meta_carboidratos, 
    meta_gorduras, image_url, is_primary, substitution_group_id, editor_version
  )
  SELECT 
    v_final_plan_id,
    p_tenant_id,
    (item->>'tipo_refeicao'),
    (item->>'day_of_week')::INT,
    (item->>'title'),
    (item->>'description'),
    (item->>'meta_calorias')::INT,
    (item->>'meta_proteinas')::INT,
    (item->>'meta_carboidratos')::INT,
    (item->>'meta_gorduras')::INT,
    (item->>'image_url'),
    (item->>'is_primary')::BOOLEAN,
    (item->>'substitution_group_id')::UUID,
    'v3'
  FROM jsonb_array_elements(p_items) AS item;

  -- 5. Promoção do Draft (Se houver)
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
$$;

GRANT EXECUTE ON FUNCTION public.publish_meal_plan_v3 TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_meal_plan_v3 TO service_role;
