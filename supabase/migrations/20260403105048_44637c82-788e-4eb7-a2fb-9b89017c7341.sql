
CREATE OR REPLACE FUNCTION public.approve_and_publish_plan(
  _plan_id uuid,
  _nutritionist_id uuid,
  _start_date date DEFAULT CURRENT_DATE,
  _duration_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan record;
  _end_date date;
  _tenant_id uuid;
  _item_count integer;
  _deleted_drafts integer;
  _draft_ids uuid[];
BEGIN
  SELECT id, patient_id, nutritionist_id, plan_status, is_active, overall_validation_status, overall_score, last_validated_at
  INTO _plan FROM public.meal_plans WHERE id = _plan_id;

  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Plan not found'); END IF;
  IF _plan.nutritionist_id != _nutritionist_id THEN RETURN jsonb_build_object('success', false, 'error', 'Unauthorized'); END IF;

  SELECT count(*) INTO _item_count FROM public.meal_plan_items WHERE meal_plan_id = _plan_id;
  IF _item_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMPTY_PLAN', 'message', 'Não é possível aprovar e publicar um plano sem refeições.');
  END IF;

  IF _plan.overall_validation_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'VALIDATION_REQUIRED', 'message', 'O plano precisa ser validado pelo Motor Clínico antes de ser publicado. Clique em "Validar" primeiro.');
  END IF;

  SELECT COALESCE(np.tenant_id, ut.tenant_id) INTO _tenant_id
  FROM public.nutritionist_patients np
  LEFT JOIN public.user_tenants ut ON ut.user_id = np.nutritionist_id
  WHERE np.patient_id = _plan.patient_id AND np.nutritionist_id = _nutritionist_id AND np.status = 'active'
  LIMIT 1;

  _end_date := _start_date + (_duration_days * interval '1 day');

  -- 1. Archive published plans
  UPDATE public.meal_plans 
  SET is_active = false, plan_status = 'archived', updated_at = now() 
  WHERE patient_id = _plan.patient_id AND id != _plan_id AND is_active = true AND plan_status = 'published_to_patient';

  -- 2. Deactivate non-published active plans
  UPDATE public.meal_plans 
  SET is_active = false, updated_at = now() 
  WHERE patient_id = _plan.patient_id AND id != _plan_id AND is_active = true AND plan_status NOT IN ('published_to_patient');

  -- 3. Collect draft IDs for cleanup
  SELECT array_agg(id) INTO _draft_ids
  FROM public.meal_plans 
  WHERE patient_id = _plan.patient_id 
    AND id != _plan_id 
    AND plan_status IN ('draft', 'draft_auto_corrected', 'draft_auto_generated', 'pending_approval', 'rejected');

  IF _draft_ids IS NOT NULL AND array_length(_draft_ids, 1) > 0 THEN
    -- Clear FK references in onboarding_pipelines
    UPDATE public.onboarding_pipelines SET generated_plan_id = NULL WHERE generated_plan_id = ANY(_draft_ids);
    -- Delete items
    DELETE FROM public.meal_plan_items WHERE meal_plan_id = ANY(_draft_ids);
    -- Delete plans
    DELETE FROM public.meal_plans WHERE id = ANY(_draft_ids);
    _deleted_drafts := array_length(_draft_ids, 1);
  ELSE
    _deleted_drafts := 0;
  END IF;

  -- 4. Activate and publish the target plan
  UPDATE public.meal_plans 
  SET plan_status = 'published_to_patient', is_active = true, overall_validation_status = 'aprovado',
      start_date = _start_date, end_date = _end_date, updated_at = now() 
  WHERE id = _plan_id;

  -- Update journey status
  UPDATE public.nutritionist_patients SET journey_status = 'active_followup'
  WHERE patient_id = _plan.patient_id AND nutritionist_id = _nutritionist_id AND status = 'active'
    AND journey_status IN ('draft_ready_for_review', 'onboarding_completed', 'plan_published');

  -- Timeline entry
  INSERT INTO public.patient_timeline (patient_id, created_by, event_type, title, description)
  VALUES (_plan.patient_id, _nutritionist_id, 'plan_published', 'Plano aprovado e publicado', 
    CASE WHEN _deleted_drafts > 0 
      THEN format('Plano publicado. %s rascunho(s) removido(s) automaticamente.', _deleted_drafts)
      ELSE 'Plano alimentar foi aprovado e publicado para o paciente.'
    END);

  RETURN jsonb_build_object(
    'success', true, 'plan_id', _plan_id, 'status', 'published_to_patient',
    'start_date', _start_date, 'end_date', _end_date, 'drafts_cleaned', _deleted_drafts
  );
END;
$$;
