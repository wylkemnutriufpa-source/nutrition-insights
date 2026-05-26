CREATE OR REPLACE FUNCTION public.check_patient_state_consistency()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_calculated public.patient_state_type;
BEGIN
    v_calculated := public.calculate_actual_patient_state(NEW.id);
    
    IF v_calculated != NEW.patient_state THEN
        -- Fix: Use NEW.user_id instead of NEW.id because state_consistency_logs.user_id 
        -- refers to auth.users, not profiles.id
        INSERT INTO public.state_consistency_logs (user_id, calculated_state, persisted_state, discrepancy_details)
        VALUES (NEW.user_id, v_calculated, NEW.patient_state, jsonb_build_object(
            'clinical_assessment_completed', NEW.clinical_assessment_completed,
            'onboarding_completed', NEW.onboarding_completed,
            'source', 'trigger_check_v3'
        ));
        
        NEW.patient_state := v_calculated;
    END IF;
    
    RETURN NEW;
END;
$function$;