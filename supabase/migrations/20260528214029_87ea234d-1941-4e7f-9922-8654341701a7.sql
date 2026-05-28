CREATE OR REPLACE FUNCTION public.apply_quick_meal_template_atomic(
  p_meal_plan_id UUID,
  p_day_of_week INTEGER,
  p_items JSONB
)
RETURNS VOID AS $$
DECLARE
  v_tenant_id UUID;
  v_plan_status TEXT;
  v_item JSONB;
BEGIN
  -- 1. Validações estruturais do payload
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Payload de itens inválido ou vazio';
  END IF;

  -- 2. Validação Clínica Pré-Execução (Itera sobre o JSON sem modificar o banco)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Title e tipo_refeicao obrigatórios
    IF (v_item->>'title') IS NULL OR (v_item->>'title') = '' THEN
      RAISE EXCEPTION 'Título do item é obrigatório';
    END IF;
    
    IF (v_item->>'tipo_refeicao') IS NULL OR (v_item->>'tipo_refeicao') = '' THEN
      RAISE EXCEPTION 'Tipo de refeição é obrigatório';
    END IF;

    -- Validação de Macros e Calorias
    IF (v_item->>'meta_calorias')::NUMERIC <= 0 THEN
      RAISE EXCEPTION 'Calorias devem ser maiores que zero para o item: %', (v_item->>'title');
    END IF;

    IF (v_item->>'meta_proteinas')::NUMERIC < 0 OR 
       (v_item->>'meta_carboidratos')::NUMERIC < 0 OR 
       (v_item->>'meta_gorduras')::NUMERIC < 0 THEN
      RAISE EXCEPTION 'Macronutrientes não podem ser negativos para o item: %', (v_item->>'title');
    END IF;
  END LOOP;

  -- 3. Recuperar metadados do plano
  SELECT tenant_id, plan_status INTO v_tenant_id, v_plan_status
  FROM public.meal_plans
  WHERE id = p_meal_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plano alimentar não encontrado';
  END IF;

  -- 4. Validar se o plano pode ser alterado
  IF v_plan_status IN ('published_to_patient', 'approved') THEN
    RAISE EXCEPTION 'Não é possível alterar um plano já publicado ou aprovado';
  END IF;

  -- 5. Se chegou aqui, as validações passaram. Executa DELETE
  DELETE FROM public.meal_plan_items
  WHERE meal_plan_id = p_meal_plan_id
    AND day_of_week = p_day_of_week;

  -- 6. INSERT dos novos itens
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.meal_plan_items (
      id,
      meal_plan_id,
      day_of_week,
      tipo_refeicao,
      title,
      description,
      meta_calorias,
      meta_proteinas,
      meta_carboidratos,
      meta_gorduras,
      item_origin,
      is_primary,
      substitution_group_id,
      tenant_id
    ) VALUES (
      CASE 
        WHEN (v_item->>'id') IS NOT NULL AND (v_item->>'id') <> '' THEN (v_item->>'id')::UUID 
        ELSE gen_random_uuid() 
      END,
      p_meal_plan_id,
      p_day_of_week,
      (v_item->>'tipo_refeicao'),
      v_item->>'title',
      v_item->>'description',
      (v_item->>'meta_calorias')::INTEGER,
      (v_item->>'meta_proteinas')::NUMERIC,
      (v_item->>'meta_carboidratos')::NUMERIC,
      (v_item->>'meta_gorduras')::NUMERIC,
      COALESCE(v_item->>'item_origin', 'in_office_template'),
      COALESCE((v_item->>'is_primary')::BOOLEAN, true),
      CASE 
        WHEN (v_item->>'substitution_group_id') IS NOT NULL AND (v_item->>'substitution_group_id') <> '' THEN (v_item->>'substitution_group_id')::UUID 
        ELSE NULL 
      END,
      v_tenant_id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.apply_quick_meal_template_atomic(UUID, INTEGER, JSONB) TO authenticated;
GRANT ALL ON FUNCTION public.apply_quick_meal_template_atomic(UUID, INTEGER, JSONB) TO service_role;