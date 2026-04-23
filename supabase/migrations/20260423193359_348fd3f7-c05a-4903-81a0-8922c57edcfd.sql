-- 1. CENTRAL LIFECYCLE RESOLUTION
CREATE OR REPLACE FUNCTION public.resolve_patient_lifecycle_state(_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _state text;
    _has_anamnesis boolean;
    _has_published_plan boolean;
    _has_approved_plan boolean;
    _has_draft_plan boolean;
BEGIN
    -- Check for explicit state overrides first
    SELECT lifecycle_state INTO _state 
    FROM public.patient_lifecycle_states 
    WHERE patient_id = _patient_id;

    -- If no explicit state, resolve based on data availability
    IF _state IS NULL THEN
        -- Check basic flags
        SELECT EXISTS (SELECT 1 FROM public.patient_anamnesis WHERE user_id = _patient_id) INTO _has_anamnesis;
        SELECT EXISTS (SELECT 1 FROM public.meal_plans WHERE patient_id = _patient_id AND plan_status = 'published') INTO _has_published_plan;
        SELECT EXISTS (SELECT 1 FROM public.meal_plans WHERE patient_id = _patient_id AND plan_status = 'approved') INTO _has_approved_plan;
        SELECT EXISTS (SELECT 1 FROM public.meal_plans WHERE patient_id = _patient_id AND plan_status IN ('draft', 'draft_auto_generated')) INTO _has_draft_plan;
        
        -- Default hierarchy
        IF _has_published_plan THEN
            _state := 'active_followup';
        ELSIF _has_approved_plan THEN
            _state := 'plan_pending_production';
        ELSIF _has_draft_plan THEN
            _state := 'onboarding_plan_generation';
        ELSIF _has_anamnesis THEN
            _state := 'onboarding_ready_for_plan';
        ELSE
            _state := 'onboarding_started';
        END IF;
    END IF;

    -- Build rich state object
    RETURN jsonb_build_object(
        'state', _state,
        'has_active_plan', COALESCE(_has_published_plan, false),
        'show_onboarding', _state LIKE 'onboarding%',
        'show_plan', _has_published_plan,
        'last_updated', now()
    );
END;
$$;

-- 2. BATCH LIFECYCLE RESOLUTION
CREATE OR REPLACE FUNCTION public.resolve_lifecycle_states_batch(_patient_ids uuid[])
RETURNS TABLE (patient_id uuid, state_data jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT id, public.resolve_patient_lifecycle_state(id)
    FROM unnest(_patient_ids) as id;
END;
$$;

-- 3. ATOMIC MEAL PLAN ACTIVATION
CREATE OR REPLACE FUNCTION public.activate_meal_plan(_plan_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _patient_id uuid;
    _nutritionist_id uuid;
BEGIN
    -- Get owner info
    SELECT patient_id, nutritionist_id INTO _patient_id, _nutritionist_id
    FROM public.meal_plans
    WHERE id = _plan_id;

    -- Security Check
    IF auth.uid() != _nutritionist_id AND auth.uid() != _patient_id THEN
        RAISE EXCEPTION 'Unauthorized: Only the assigned nutritionist or patient can activate a plan.';
    END IF;

    -- Atomic switch
    UPDATE public.meal_plans 
    SET is_active = false 
    WHERE patient_id = _patient_id AND id != _plan_id;

    UPDATE public.meal_plans 
    SET is_active = true, 
        plan_status = 'published',
        updated_at = now()
    WHERE id = _plan_id;

    -- Update lifecycle state immediately
    INSERT INTO public.patient_lifecycle_states (patient_id, lifecycle_state)
    VALUES (_patient_id, 'active_followup')
    ON CONFLICT (patient_id) DO UPDATE SET 
        lifecycle_state = 'active_followup',
        updated_at = now();
END;
$$;

-- 4. FAIL-CLOSED RLS ENFORCEMENT

-- Lead Requests Protection
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_requests') THEN
        ALTER TABLE public.lead_requests ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Leads are private" ON public.lead_requests;
        CREATE POLICY "Leads are private" ON public.lead_requests 
        FOR SELECT USING (
            auth.uid() = nutritionist_id OR
            EXISTS (
                SELECT 1 FROM public.nutritionist_patients np 
                WHERE np.patient_id = lead_requests.id AND np.nutritionist_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Anamnesis Cross-Tenant Fix
ALTER TABLE public.patient_anamnesis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Nutritionists can only see their own patients' anamnesis" ON public.patient_anamnesis;
CREATE POLICY "Nutritionists can only see their own patients' anamnesis" 
ON public.patient_anamnesis FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients np 
    WHERE np.patient_id = patient_anamnesis.user_id 
    AND np.nutritionist_id = auth.uid()
  )
);

-- Booking Payments
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_payments') THEN
        ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Nutritionists can view their tenant payments" ON public.booking_payments;
        CREATE POLICY "Nutritionists can view their tenant payments" 
        ON public.booking_payments FOR SELECT 
        USING (auth.uid() = nutritionist_id);
    END IF;
END $$;

-- 5. FAIL-FAST VALIDATION
CREATE OR REPLACE FUNCTION public.ensure_meal_candidates()
RETURNS trigger AS $$
BEGIN
  IF NEW.plan_status = 'published' THEN
    IF NOT EXISTS (SELECT 1 FROM public.meal_plan_items WHERE meal_plan_id = NEW.id) THEN
       RAISE EXCEPTION 'Fail-Fast: Cannot publish a meal plan with zero items.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_meal_candidates ON public.meal_plans;
CREATE TRIGGER trg_ensure_meal_candidates
BEFORE UPDATE ON public.meal_plans
FOR EACH ROW
EXECUTE FUNCTION public.ensure_meal_candidates();
