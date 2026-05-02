CREATE TABLE IF NOT EXISTS public.state_consistency_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    calculated_state public.patient_state_type,
    persisted_state public.patient_state_type,
    discrepancy_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.state_consistency_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow system to insert consistency logs" 
ON public.state_consistency_logs FOR INSERT 
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.calculate_actual_patient_state(p_user_id UUID)
RETURNS public.patient_state_type AS $$
DECLARE
    v_has_anamnesis BOOLEAN;
    v_has_plan BOOLEAN;
    v_has_active_plan BOOLEAN;
BEGIN
    -- Check anamnesis
    SELECT EXISTS(SELECT 1 FROM public.anamnesis_responses WHERE patient_id = p_user_id) INTO v_has_anamnesis;

    -- Check plans
    SELECT EXISTS(SELECT 1 FROM public.meal_plans WHERE patient_id = p_user_id) INTO v_has_plan;
    SELECT EXISTS(SELECT 1 FROM public.meal_plans WHERE patient_id = p_user_id AND plan_status = 'published_to_patient') INTO v_has_active_plan;

    -- Determine state
    IF v_has_active_plan THEN RETURN 'active_plan';
    ELSIF v_has_plan THEN RETURN 'plan_generated';
    ELSIF v_has_anamnesis THEN RETURN 'ready_for_plan';
    ELSE RETURN 'anamnesis'; -- Assuming slides are done if they passed initial check
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_patient_state_consistency()
RETURNS TRIGGER AS $$
DECLARE
    v_calculated public.patient_state_type;
BEGIN
    v_calculated := public.calculate_actual_patient_state(NEW.id);
    
    -- We only auto-upgrade state, never downgrade automatically via trigger to avoid flickering
    -- unless the discrepancy is critical (e.g. state says slides but anamnesis exists)
    IF v_calculated != NEW.patient_state THEN
        INSERT INTO public.state_consistency_logs (user_id, calculated_state, persisted_state, discrepancy_details)
        VALUES (NEW.id, v_calculated, NEW.patient_state, jsonb_build_object(
            'is_anamnesis_completed', NEW.is_anamnesis_completed,
            'source', 'trigger_check'
        ));
        
        -- Auto-fix if inconsistent and higher priority
        NEW.patient_state := v_calculated;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_patient_state_consistency ON public.profiles;
CREATE TRIGGER tr_check_patient_state_consistency
BEFORE UPDATE OF patient_state, is_anamnesis_completed ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_patient_state_consistency();