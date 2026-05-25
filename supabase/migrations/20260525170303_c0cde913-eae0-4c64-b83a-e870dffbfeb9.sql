-- 1. Drop existing functions that might have conflicting parameter names
DROP FUNCTION IF EXISTS public.calculate_actual_patient_state(uuid);
DROP FUNCTION IF EXISTS public.get_calculated_patient_state(uuid);

-- 2. Recreate state calculation function
CREATE OR REPLACE FUNCTION public.get_calculated_patient_state(p_user_id UUID)
RETURNS public.patient_state_type AS $$
DECLARE
    v_has_anamnesis BOOLEAN;
    v_has_plan BOOLEAN;
    v_onboarding_completed BOOLEAN;
BEGIN
    -- Use the new canonical columns in profiles
    SELECT 
        COALESCE(onboarding_completed, false), 
        COALESCE(clinical_assessment_completed, false) 
    INTO v_onboarding_completed, v_has_anamnesis 
    FROM public.profiles 
    WHERE user_id = p_user_id;
    
    -- Fallback check in patient_anamnesis if flag is false but data exists
    IF NOT v_has_anamnesis THEN
        SELECT EXISTS(SELECT 1 FROM public.patient_anamnesis WHERE user_id = p_user_id) INTO v_has_anamnesis;
    END IF;
    
    -- Check for active meal plan (published_to_patient is the state that counts as active for the patient)
    SELECT EXISTS(
        SELECT 1 FROM public.meal_plans 
        WHERE (patient_id = p_user_id OR patient_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id))
        AND (is_active = true OR plan_status = 'published_to_patient')
    ) INTO v_has_plan;

    -- V3 Deterministic logic
    IF v_has_plan THEN
        RETURN 'active_plan';
    ELSIF v_has_anamnesis THEN
        RETURN 'ready_for_plan';
    ELSIF v_onboarding_completed THEN
        RETURN 'anamnesis';
    ELSE
        RETURN 'onboarding_slides';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Recreate consistency check helper
CREATE OR REPLACE FUNCTION public.calculate_actual_patient_state(p_profile_id UUID)
RETURNS public.patient_state_type AS $$
DECLARE
    v_user_id UUID;
    v_has_anamnesis BOOLEAN;
    v_has_plan BOOLEAN;
    v_onboarding_completed BOOLEAN;
BEGIN
    -- Get user_id first
    SELECT user_id INTO v_user_id FROM public.profiles WHERE id = p_profile_id;
    
    IF v_user_id IS NULL THEN RETURN 'onboarding_slides'; END IF;

    SELECT 
        COALESCE(onboarding_completed, false), 
        COALESCE(clinical_assessment_completed, false) 
    INTO v_onboarding_completed, v_has_anamnesis 
    FROM public.profiles 
    WHERE id = p_profile_id;

    IF NOT v_has_anamnesis THEN
        SELECT EXISTS(SELECT 1 FROM public.patient_anamnesis WHERE user_id = v_user_id) INTO v_has_anamnesis;
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM public.meal_plans 
        WHERE (patient_id = p_profile_id OR patient_id = v_user_id)
        AND (is_active = true OR plan_status = 'published_to_patient')
    ) INTO v_has_plan;

    IF v_has_plan THEN RETURN 'active_plan';
    ELSIF v_has_anamnesis THEN RETURN 'ready_for_plan';
    ELSIF v_onboarding_completed THEN RETURN 'anamnesis';
    ELSE RETURN 'onboarding_slides';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Update the trigger function
CREATE OR REPLACE FUNCTION public.check_patient_state_consistency()
RETURNS TRIGGER AS $$
DECLARE
    v_calculated public.patient_state_type;
BEGIN
    v_calculated := public.calculate_actual_patient_state(NEW.id);
    
    IF v_calculated != NEW.patient_state THEN
        INSERT INTO public.state_consistency_logs (user_id, calculated_state, persisted_state, discrepancy_details)
        VALUES (NEW.id, v_calculated, NEW.patient_state, jsonb_build_object(
            'clinical_assessment_completed', NEW.clinical_assessment_completed,
            'onboarding_completed', NEW.onboarding_completed,
            'source', 'trigger_check_v3'
        ));
        
        NEW.patient_state := v_calculated;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Recreate triggers without the dropped columns
DROP TRIGGER IF EXISTS tr_sync_patient_state ON public.profiles;
CREATE TRIGGER tr_sync_patient_state
BEFORE INSERT OR UPDATE OF onboarding_completed, clinical_assessment_completed ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_patient_state();

DROP TRIGGER IF EXISTS tr_check_patient_state_consistency ON public.profiles;
CREATE TRIGGER tr_check_patient_state_consistency
BEFORE UPDATE OF patient_state, clinical_assessment_completed ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_patient_state_consistency();

-- 6. Final sync to fix existing inconsistencies
UPDATE public.profiles SET patient_state = public.get_calculated_patient_state(user_id);
