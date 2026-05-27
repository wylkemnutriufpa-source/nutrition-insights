-- Migration: Atomic Onboarding Approval (Bug #3 Fix)
-- Purpose: Consolidate the multi-step approval flow into a single atomic transaction
-- Changes: New RPC `complete_onboarding_approval_atomic`

CREATE OR REPLACE FUNCTION public.complete_onboarding_approval_atomic(
  _pipeline_id uuid,
  _plan_id uuid,
  _nutritionist_id uuid,
  _patient_id uuid,
  _use_scheduling boolean DEFAULT false,
  _scheduling_criteria jsonb DEFAULT NULL,
  _other_plan_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _success boolean := false;
  _error_msg text := '';
  _item_count integer := 0;
  _other_plan_id uuid;
BEGIN
  -- Start transaction (implicit in SECURITY DEFINER)
  
  -- Step 1: Validate plan has items (reuse blocker from publish_meal_plan)
  SELECT count(*) INTO _item_count
  FROM public.meal_plan_items
  WHERE meal_plan_id = _plan_id;
  
  IF _item_count = 0 THEN
    _error_msg := 'EMPTY_PLAN: Não é possível publicar um plano sem refeições. Adicione itens antes de publicar.';
    RAISE EXCEPTION '%', _error_msg;
  END IF;
  
  -- Step 2: Mark onboarding pipeline as completed (atomic with rest)
  UPDATE public.onboarding_pipelines
  SET
    plan_approved = true,
    approved_by = _nutritionist_id,
    approved_at = NOW(),
    status = 'completed',
    use_scheduling_criteria = _use_scheduling,
    scheduling_criteria = COALESCE(_scheduling_criteria, scheduling_criteria)
  WHERE id = _pipeline_id
    AND patient_id = _patient_id;
  
  IF NOT FOUND THEN
    _error_msg := 'Pipeline não encontrado ou não pertence ao paciente';
    RAISE EXCEPTION '%', _error_msg;
  END IF;
  
  -- Step 3: Publish the meal plan (reuse the safe blocker version)
  UPDATE public.meal_plans
  SET plan_status = 'published_to_patient',
      is_active = true,
      updated_at = NOW()
  WHERE id = _plan_id
    AND nutritionist_id = _nutritionist_id;
  
  IF NOT FOUND THEN
    _error_msg := 'Plano não encontrado ou você não tem permissão para publicar';
    RAISE EXCEPTION '%', _error_msg;
  END IF;
  
  -- Step 4: Archive previous active plans for this patient
  UPDATE public.meal_plans
  SET is_active = false, updated_at = NOW()
  WHERE patient_id = _patient_id
    AND id != _plan_id
    AND is_active = true;
  
  -- Step 5: Insert plan schedule if enabled
  IF _use_scheduling THEN
    INSERT INTO public.plan_schedules (
      meal_plan_id,
      activate_at,
      criteria,
      status
    ) VALUES (
      _plan_id,
      (NOW() + INTERVAL '1 day' * COALESCE((_scheduling_criteria->>'checklist_days')::integer, 14))::date,
      _scheduling_criteria,
      'scheduled'
    );
  END IF;
  
  -- Step 6: Insert notification for patient
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    action_url
  ) VALUES (
    _patient_id,
    'Plano Alimentar Aprovado! 🎉',
    'Seu plano foi revisado e aprovado. Acesse em "Minha Dieta". Validade: 30 dias.',
    'success',
    '/my-diet'
  );
  
  -- Step 7: Reject other plan options
  IF _other_plan_ids IS NOT NULL AND array_length(_other_plan_ids, 1) > 0 THEN
    FOREACH _other_plan_id IN ARRAY _other_plan_ids LOOP
      UPDATE public.meal_plans
      SET plan_status = 'rejected',
          is_active = false,
          updated_at = NOW()
      WHERE id = _other_plan_id
        AND nutritionist_id = _nutritionist_id;
      
      -- Log rejection
      INSERT INTO public.system_error_logs (
        error_code,
        error_message,
        metadata
      ) VALUES (
        'ALTERNATIVE_PLAN_REJECTED',
        'Opção de plano não selecionada durante aprovação',
        jsonb_build_object('plan_id', _other_plan_id, 'selected_plan_id', _plan_id)
      );
    END LOOP;
  END IF;
  
  -- All steps succeeded
  _success := true;
  
  RETURN jsonb_build_object(
    'success', _success,
    'pipeline_id', _pipeline_id,
    'plan_id', _plan_id,
    'message', 'Onboarding aprovado e publicado com sucesso (atômico)'
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Automatic ROLLBACK from transaction scope
  RETURN jsonb_build_object(
    'success', false,
    'error', COALESCE(_error_msg, SQLERRM),
    'pipeline_id', _pipeline_id,
    'plan_id', _plan_id
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.complete_onboarding_approval_atomic TO authenticated;

-- Log this migration
INSERT INTO public.system_error_logs (
  error_code,
  error_message,
  metadata
) VALUES (
  'MIGRATION_APPLIED',
  'Bug #3 Fix: complete_onboarding_approval_atomic RPC created (atomic onboarding approval)',
  jsonb_build_object('migration', '20260527_atomic_onboarding_approval', 'timestamp', NOW())
);
