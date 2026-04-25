-- Create audit table for triggers
CREATE TABLE IF NOT EXISTS public.trigger_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    trigger_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    record_id UUID NOT NULL,
    changed_data JSONB,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    trigger_depth INTEGER,
    executed_by UUID DEFAULT auth.uid()
);

-- Enable RLS on audit logs
ALTER TABLE public.trigger_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins or the nutritionist of the plan (complex) can see logs, 
-- but for simplicity let's allow admins and the user who triggered it.
CREATE POLICY "Admins can view all trigger logs" 
ON public.trigger_audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Audit function
CREATE OR REPLACE FUNCTION public.audit_trigger_execution()
RETURNS TRIGGER AS $$
DECLARE
    v_changed JSONB := '{}'::jsonb;
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        -- Only record actual differences to save space
        SELECT jsonb_object_agg(new_key, new_val)
        INTO v_changed
        FROM jsonb_each(to_jsonb(NEW)) AS n(new_key, new_val)
        JOIN jsonb_each(to_jsonb(OLD)) AS o(old_key, old_val) ON new_key = old_key
        WHERE new_val IS DISTINCT FROM old_val;
    ELSIF (TG_OP = 'INSERT') THEN
        v_changed := to_jsonb(NEW);
    ELSIF (TG_OP = 'DELETE') THEN
        v_changed := to_jsonb(OLD);
    END IF;

    INSERT INTO public.trigger_audit_logs (
        table_name, 
        trigger_name, 
        operation, 
        record_id, 
        changed_data, 
        trigger_depth
    )
    VALUES (
        TG_TABLE_NAME, 
        TG_NAME, 
        TG_OP, 
        COALESCE(NEW.id, OLD.id), 
        v_changed, 
        pg_trigger_depth()
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Guardrail for meal_plan_items
CREATE OR REPLACE FUNCTION public.guardrail_meal_plan_item_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- If we are inside another trigger (depth > 1), block changes to protected fields
    IF pg_trigger_depth() > 1 AND TG_OP = 'UPDATE' THEN
        IF OLD.title IS DISTINCT FROM NEW.title OR
           OLD.meal_type IS DISTINCT FROM NEW.meal_type OR
           OLD.day_of_week IS DISTINCT FROM NEW.day_of_week OR
           OLD.meal_plan_id IS DISTINCT FROM NEW.meal_plan_id THEN
            RAISE EXCEPTION 'Guardrail violation: Trigger attempted to modify protected structure fields in meal_plan_items (title, type, day, or plan_id)';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Guardrail for meal_plans
CREATE OR REPLACE FUNCTION public.guardrail_meal_plan_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- If we are inside another trigger (depth > 1), block changes to protected fields
    IF pg_trigger_depth() > 1 AND TG_OP = 'UPDATE' THEN
        IF OLD.title IS DISTINCT FROM NEW.title OR
           OLD.patient_id IS DISTINCT FROM NEW.patient_id OR
           OLD.nutritionist_id IS DISTINCT FROM NEW.nutritionist_id OR
           OLD.start_date IS DISTINCT FROM NEW.start_date THEN
            RAISE EXCEPTION 'Guardrail violation: Trigger attempted to modify protected fields in meal_plans (title, patient, nutritionist, or start_date)';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Audit Triggers (AFTER to catch results)
DROP TRIGGER IF EXISTS audit_meal_plans_trigger ON public.meal_plans;
CREATE TRIGGER audit_meal_plans_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.meal_plans
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_execution();

DROP TRIGGER IF EXISTS audit_meal_plan_items_trigger ON public.meal_plan_items;
CREATE TRIGGER audit_meal_plan_items_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.meal_plan_items
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_execution();

-- Apply Guardrail Triggers (BEFORE to block)
DROP TRIGGER IF EXISTS guardrail_meal_plan_items_trigger ON public.meal_plan_items;
CREATE TRIGGER guardrail_meal_plan_items_trigger
BEFORE UPDATE ON public.meal_plan_items
FOR EACH ROW EXECUTE FUNCTION public.guardrail_meal_plan_item_updates();

DROP TRIGGER IF EXISTS guardrail_meal_plan_trigger ON public.meal_plans;
CREATE TRIGGER guardrail_meal_plan_trigger
BEFORE UPDATE ON public.meal_plans
FOR EACH ROW EXECUTE FUNCTION public.guardrail_meal_plan_updates();
