CREATE OR REPLACE FUNCTION public.ensure_patient_ready(_patient_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_link RECORD;
  v_issues TEXT[] := ARRAY[]::TEXT[];
  v_actions JSONB := '[]'::jsonb;
  v_has_active_plan BOOLEAN := false;
BEGIN
  IF _patient_id IS NULL THEN
    RETURN jsonb_build_object('status','error','issues', ARRAY['null_patient_id'], 'actions', '[]'::jsonb);
  END IF;

  -- 1. Verifica se há um plano ativo publicado (prioridade máxima)
  SELECT EXISTS (
    SELECT 1
    FROM public.meal_plans mp
    WHERE mp.patient_id = _patient_id
      AND mp.is_active = true
      AND mp.plan_status = 'published_to_patient'
  ) INTO v_has_active_plan;

  IF v_has_active_plan THEN
    RETURN jsonb_build_object('status','ok','issues', ARRAY['active_plan_visible'], 'actions', '[]'::jsonb);
  END IF;

  -- 2. Busca vínculo mais recente
  SELECT np.*
  INTO v_link
  FROM public.nutritionist_patients np
  WHERE np.patient_id = _patient_id
    AND np.status = 'active'
  ORDER BY np.created_at DESC
  LIMIT 1;

  -- Se não há vínculo nenhum, retornamos status 'no_link' para que o frontend bloqueie o acesso com mensagem clara
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','no_link','issues', ARRAY['no_nutritionist_link'], 'actions', '[]'::jsonb);
  END IF;

  -- 3. Blindagem de Estados Fluidos
  IF v_link.journey_status IN (
    'lead_created',
    'awaiting_consent',
    'onboarding_active',
    'onboarding_completed',
    'draft_ready_for_review',
    'plan_published',
    'active_followup',
    'clinical_followup_active',
    'active',
    'awaiting_onboarding_release'
  ) THEN
    RETURN jsonb_build_object('status','ok','issues', ARRAY['fluid_journey_state'], 'actions', '[]'::jsonb);
  END IF;

  -- 4. Tratamento de links inativos ou estados bloqueantes (ex: cancelado)
  IF v_link.journey_status IN ('archived', 'cancelled') THEN
    RETURN jsonb_build_object('status', 'error', 'issues', ARRAY['blocked_status'], 'actions', '[]'::jsonb);
  END IF;

  -- Fallback padrão: OK (resiliência)
  RETURN jsonb_build_object('status','ok','issues', ARRAY[]::TEXT[], 'actions', '[]'::jsonb);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('status','error','issues', ARRAY['exception:' || SQLERRM], 'actions', '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
