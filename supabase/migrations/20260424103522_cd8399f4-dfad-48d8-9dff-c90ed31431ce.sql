-- Diagnostic RPC for plan investigation
CREATE OR REPLACE FUNCTION public.get_plan_diagnostics(p_patient_id UUID)
RETURNS TABLE (
    tenant_id UUID,
    status TEXT,
    plan_mode TEXT,
    is_active BOOLEAN,
    plan_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mp.tenant_id,
        mp.status,
        mp.plan_mode,
        mp.is_active,
        COUNT(*)::BIGINT as plan_count
    FROM public.meal_plans mp
    WHERE mp.patient_id = p_patient_id
    GROUP BY mp.tenant_id, mp.status, mp.plan_mode, mp.is_active;
END;
$$;

-- Function to validate image integrity (Recipe-only images)
CREATE OR REPLACE FUNCTION public.validate_meal_image_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- If there's an image URL but no recipe_id, strip the image
    IF NEW.image_url IS NOT NULL AND NEW.recipe_id IS NULL THEN
        NEW.image_url := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce image integrity on insert/update
DROP TRIGGER IF EXISTS tr_validate_meal_image ON public.meal_plan_items;
CREATE TRIGGER tr_validate_meal_image
BEFORE INSERT OR UPDATE ON public.meal_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_meal_image_integrity();

-- System alerts table for automated notifications
CREATE TABLE IF NOT EXISTS public.system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    severity TEXT DEFAULT 'warning',
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view system alerts" ON public.system_alerts FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
