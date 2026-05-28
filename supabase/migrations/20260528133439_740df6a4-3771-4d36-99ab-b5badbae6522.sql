-- 1. Garantir colunas essenciais no meal_plan_items
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_plan_items' AND column_name = 'clinical_mass_g') THEN
        ALTER TABLE public.meal_plan_items ADD COLUMN clinical_mass_g NUMERIC;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_plan_items' AND column_name = 'editor_version') THEN
        ALTER TABLE public.meal_plan_items ADD COLUMN editor_version TEXT DEFAULT 'v2';
    END IF;
END $$;

-- 2. Ajustar padrões de segurança no meal_plans
ALTER TABLE public.meal_plans ALTER COLUMN is_active SET DEFAULT false;

-- 3. Atualizar a RPC de Publicação para ser mais robusta
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
  -- 🛡️ SOBERANIA: Garante que apenas UM plano seja ativo por vez
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
      p_patient_id,
      p_nutritionist_id,
      p_tenant_id,
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

  -- 4. Sincronismo de Itens (Idempotência: Deletar existentes e re-inserir na mesma transação)
  DELETE FROM public.meal_plan_items WHERE meal_plan_id = v_final_plan_id;

  INSERT INTO public.meal_plan_items (
    meal_plan_id, tenant_id, tipo_refeicao, day_of_week, title, 
    description, meta_calorias, meta_proteinas, meta_carboidratos, 
    meta_gorduras, image_url, is_primary, substitution_group_id, editor_version, clinical_mass_g
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
    (item->>'clinical_mass_g')::NUMERIC
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

-- 4. Corrigir Políticas de RLS para Acesso Público via Token (WhatsApp Sharing)
-- Permitir SELECT público se houver um token válido
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public access via sharing token" ON public.meal_plans;
    CREATE POLICY "Public access via sharing token" 
    ON public.meal_plans 
    FOR SELECT 
    USING (sharing_token IS NOT NULL AND is_sharing_enabled = true);

    DROP POLICY IF EXISTS "Public access to items via plan token" ON public.meal_plan_items;
    CREATE POLICY "Public access to items via plan token" 
    ON public.meal_plan_items 
    FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.meal_plans 
        WHERE id = meal_plan_id 
        AND sharing_token IS NOT NULL 
        AND is_sharing_enabled = true
    ));
END $$;

-- 5. Corrigir Políticas para whatsapp_logs
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Professionals manage own whatsapp logs" ON public.whatsapp_logs;
CREATE POLICY "Professionals manage own whatsapp logs" 
ON public.whatsapp_logs 
FOR ALL 
TO authenticated 
USING (professional_id = auth.uid())
WITH CHECK (professional_id = auth.uid());

-- 6. Reestabelecer Grants Globais
GRANT ALL ON public.meal_plans TO authenticated, service_role;
GRANT ALL ON public.meal_plan_items TO authenticated, service_role;
GRANT ALL ON public.whatsapp_logs TO authenticated, service_role;
GRANT ALL ON public.v3_drafts TO authenticated, service_role;

-- 7. Garantir que a coluna is_active no meal_plans tenha um índice de unicidade funcional
-- Já existe, mas vamos garantir que ele use o filtro correto
DROP INDEX IF EXISTS public.idx_one_active_plan_per_patient;
CREATE UNIQUE INDEX idx_one_active_plan_per_patient ON public.meal_plans (patient_id) WHERE (is_active = true);
