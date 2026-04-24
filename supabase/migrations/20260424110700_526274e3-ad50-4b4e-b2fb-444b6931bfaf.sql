-- Function to find the effective meal plan for a patient on a specific date
CREATE OR REPLACE FUNCTION public.resolve_patient_meal_plan(
    p_patient_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_plan RECORD;
    v_day_of_week INT;
BEGIN
    v_day_of_week := EXTRACT(DOW FROM p_date);

    -- Find the most relevant published plan
    -- Priority: Active published plans, ordered by creation (newest first)
    SELECT * INTO v_plan
    FROM public.meal_plans
    WHERE patient_id = p_patient_id
      AND plan_status = 'published_to_patient'
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_plan.id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Return plan metadata along with the items for that specific day
    RETURN jsonb_build_object(
        'id', v_plan.id,
        'title', v_plan.title,
        'plan_mode', v_plan.plan_mode,
        'start_date', v_plan.start_date,
        'description', v_plan.description,
        'totals_status', v_plan.totals_status,
        'items', (
            SELECT jsonb_agg(i.*)
            FROM public.meal_plan_items i
            WHERE i.meal_plan_id = v_plan.id
              AND (
                  (v_plan.plan_mode = 'single_day') OR 
                  (v_plan.plan_mode = 'weekly' AND i.day_of_week = v_day_of_week) OR
                  (v_plan.plan_mode IS NULL AND i.day_of_week = v_day_of_week)
              )
        )
    );
END;
$$;

-- Trigger to ensure new patients default to 'basic' experience mode
CREATE OR REPLACE FUNCTION public.ensure_default_experience_mode()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.experience_mode IS NULL THEN
        NEW.experience_mode := 'basic';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_default_experience_mode ON public.profiles;
CREATE TRIGGER tr_default_experience_mode
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_default_experience_mode();

-- Update existing profiles that are null
UPDATE public.profiles SET experience_mode = 'basic' WHERE experience_mode IS NULL;
