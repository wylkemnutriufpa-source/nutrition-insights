-- Update the lifecycle resolution function to return the full plan record
CREATE OR REPLACE FUNCTION public.resolve_patient_lifecycle_state(_patient_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _result JSONB;
    _active_plan RECORD;
    _onboarding RECORD;
    _latest_checkin TIMESTAMP WITH TIME ZONE;
    _adherence NUMERIC;
    _state TEXT;
BEGIN
    -- Get active or latest published plan
    SELECT * INTO _active_plan
    FROM public.meal_plans
    WHERE patient_id = _patient_id
    AND (is_active = true OR plan_status IN ('published', 'published_to_patient'))
    ORDER BY created_at DESC
    LIMIT 1;

    -- Get onboarding status
    SELECT * INTO _onboarding
    FROM public.onboarding_pipelines
    WHERE patient_id = _patient_id
    AND status NOT IN ('completed', 'superseded_by_active_plan', 'superseded_by_published_plan', 'superseded_by_reset')
    ORDER BY created_at DESC
    LIMIT 1;

    -- Basic state determination logic (simplified for this update)
    IF _active_plan.id IS NOT NULL THEN
        _state := 'plan_delivered';
    ELSIF _onboarding.id IS NOT NULL THEN
        IF _onboarding.plan_generated THEN
            _state := 'plan_pending_production';
        ELSIF _onboarding.preferences_completed THEN
            _state := 'onboarding_ready_for_plan';
        ELSE
            _state := 'onboarding_started';
        END IF;
    ELSE
        _state := 'onboarding_started';
    END IF;

    -- Build final response
    _result := jsonb_build_object(
        'lifecycle_state', _state,
        'has_active_plan', _active_plan.id IS NOT NULL,
        'plan_id', _active_plan.id,
        'plan_title', _active_plan.title,
        'plan', to_jsonb(_active_plan),
        'has_pending_onboarding', _onboarding.id IS NOT NULL,
        'onboarding_status', _onboarding.status
    );

    RETURN _result;
END;
$$;
