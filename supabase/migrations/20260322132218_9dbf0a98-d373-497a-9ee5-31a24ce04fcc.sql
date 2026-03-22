
-- Fix remaining function without search_path
CREATE OR REPLACE FUNCTION public.activate_meal_plan_ai_guarded(p_meal_plan_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_validated BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM patient_timeline
        WHERE (metadata->>'type' = 'ai_plan_generated'
            OR metadata->>'type' = 'ai_plan_validated')
          AND metadata->>'meal_plan_id' = p_meal_plan_id::text
    ) INTO v_validated;

    IF NOT v_validated THEN
        RAISE EXCEPTION 'CLINICAL_VALIDATION_REQUIRED: O plano deve ser auditado pelo Motor Clínico antes da ativação. Clique em "Auditar / Validar Plano" e corrija os apontamentos antes de ativar.';
    END IF;

    UPDATE meal_plans SET is_active = true WHERE id = p_meal_plan_id;
END;
$$;
