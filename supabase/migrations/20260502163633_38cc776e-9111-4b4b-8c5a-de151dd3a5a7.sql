-- Fix the calculation function to use user_id
CREATE OR REPLACE FUNCTION public.get_calculated_patient_state(p_user_id UUID)
RETURNS public.patient_state_type AS $$
DECLARE
    v_has_anamnesis BOOLEAN;
    v_has_plan BOOLEAN;
    v_onboarding_completed BOOLEAN;
BEGIN
    -- Use user_id for matching profile
    SELECT COALESCE(fit_intelligence_onboarded, false), COALESCE(is_anamnesis_completed, false) 
    INTO v_onboarding_completed, v_has_anamnesis 
    FROM public.profiles 
    WHERE user_id = p_user_id;
    
    -- Se não encontrou no profile, tenta na tabela de anamnesis
    IF NOT v_has_anamnesis THEN
        SELECT EXISTS(SELECT 1 FROM public.patient_anamnesis WHERE user_id = p_user_id) INTO v_has_anamnesis;
    END IF;
    
    -- Verificar plano ativo (meal_plans usa patient_id que pode ser profile.id ou auth.user_id dependendo da implementação)
    -- Vamos checar ambos para garantir
    SELECT EXISTS(
        SELECT 1 FROM public.meal_plans 
        WHERE (patient_id = p_user_id OR patient_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id))
        AND is_active = true
    ) INTO v_has_plan;

    -- Lógica determinística
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

-- Function to sync the state column
CREATE OR REPLACE FUNCTION public.sync_patient_state()
RETURNS TRIGGER AS $$
BEGIN
    NEW.patient_state = public.get_calculated_patient_state(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on profiles
DROP TRIGGER IF EXISTS tr_sync_patient_state ON public.profiles;
CREATE TRIGGER tr_sync_patient_state
BEFORE INSERT OR UPDATE OF fit_intelligence_onboarded, is_anamnesis_completed ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_patient_state();

-- Update existing profiles to correct states
UPDATE public.profiles SET patient_state = public.get_calculated_patient_state(user_id);
