CREATE OR REPLACE FUNCTION public.ensure_patient_ready(_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_link RECORD;
  v_issues TEXT[] := ARRAY[]::TEXT[];
  v_actions JSONB := '[]'::jsonb;
  v_has_active_plan BOOLEAN := false;
BEGIN
  IF _patient_id IS NULL THEN
    RETURN jsonb_build_object('status','error','issues', ARRAY['null_patient_id'], 'actions', '[]'::jsonb);
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.meal_plans mp
    WHERE mp.patient_id = _patient_id
      AND mp.is_active = true
      AND mp.plan_status = 'published_to_patient'
  ) INTO v_has_active_plan;

  SELECT np.*, op.status AS pipeline_status, op.release_status
  INTO v_link
  FROM public.nutritionist_patients np
  LEFT JOIN public.onboarding_pipelines op ON op.patient_id = np.patient_id
  WHERE np.patient_id = _patient_id
  ORDER BY np.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','ok','issues', ARRAY['no_nutritionist_link'], 'actions', '[]'::jsonb);
  END IF;

  IF v_has_active_plan THEN
    RETURN jsonb_build_object(
      'status','ok',
      'issues', CASE
        WHEN v_link.pipeline_status IN ('superseded_by_published_plan', 'superseded_by_active_plan')
          THEN ARRAY['active_plan_visible']::text[]
        ELSE ARRAY[]::text[]
      END,
      'actions', '[]'::jsonb
    );
  END IF;

  IF v_link.status = 'inactive' AND v_link.journey_status NOT IN ('invited','archived','cancelled') THEN
    v_issues := array_append(v_issues, 'inactive_link');
  END IF;

  IF v_link.journey_status IN ('onboarding_active','onboarding_completed') AND v_link.pipeline_status IS NULL THEN
    v_issues := array_append(v_issues, 'missing_pipeline');
  END IF;

  IF v_link.pipeline_status IN ('pending_anamnesis','collecting_data')
     AND COALESCE(v_link.release_status,'') <> 'released' THEN
    v_issues := array_append(v_issues, 'pipeline_locked');
  END IF;

  IF array_length(v_issues, 1) IS NULL THEN
    RETURN jsonb_build_object('status','ok','issues', ARRAY[]::TEXT[], 'actions', '[]'::jsonb);
  ELSE
    RETURN jsonb_build_object('status','error','issues', v_issues, 'actions', v_actions);
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('status','error','issues', ARRAY['exception:' || SQLERRM], 'actions', '[]'::jsonb);
END;
$function$;