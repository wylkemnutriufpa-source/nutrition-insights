-- Optimize get_user_tenant to use session-level caching
CREATE OR REPLACE FUNCTION public.get_user_tenant()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    _tenant_id text;
    _found_id uuid;
BEGIN
    -- Try to get from session cache first
    _tenant_id := current_setting('app.current_tenant', true);
    IF _tenant_id IS NOT NULL AND _tenant_id <> '' THEN
        RETURN _tenant_id::uuid;
    END IF;

    -- If not in cache, query and set it
    SELECT tenant_id INTO _found_id
    FROM public.user_tenants
    WHERE user_id = auth.uid()
    ORDER BY joined_at ASC
    LIMIT 1;

    IF _found_id IS NOT NULL THEN
        PERFORM set_config('app.current_tenant', _found_id::text, true);
    END IF;

    RETURN _found_id;
END;
$$;

-- Optimize get_user_tenant(uuid) similarly
CREATE OR REPLACE FUNCTION public.get_user_tenant(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    _tenant_id text;
    _found_id uuid;
BEGIN
    -- Check if it matches the current authenticated user first for caching
    IF _user_id = auth.uid() THEN
        _tenant_id := current_setting('app.current_tenant', true);
        IF _tenant_id IS NOT NULL AND _tenant_id <> '' THEN
            RETURN _tenant_id::uuid;
        END IF;
    END IF;

    SELECT tenant_id INTO _found_id
    FROM public.user_tenants
    WHERE user_id = _user_id
    ORDER BY joined_at ASC
    LIMIT 1;

    IF _user_id = auth.uid() AND _found_id IS NOT NULL THEN
        PERFORM set_config('app.current_tenant', _found_id::text, true);
    END IF;

    RETURN _found_id;
END;
$$;

-- Ensure indexes for RLS policies
CREATE INDEX IF NOT EXISTS idx_nos_foods_tenant_id ON public.nos_foods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_metabolic_phase_history_patient_id ON public.metabolic_phase_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_nutritionist_patients_lookup ON public.nutritionist_patients(patient_id, nutritionist_id, status);

-- Update RLS policies to be more efficient
-- nos_foods
DROP POLICY IF EXISTS "nos_foods select" ON public.nos_foods;
CREATE POLICY "nos_foods select" ON public.nos_foods
FOR SELECT TO public
USING (tenant_id IS NULL OR tenant_id = get_user_tenant());

-- metabolic_phase_history
DROP POLICY IF EXISTS "Nutritionists can view patient phase history" ON public.metabolic_phase_history;
CREATE POLICY "Nutritionists can view patient phase history" ON public.metabolic_phase_history
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM nutritionist_patients 
    WHERE patient_id = metabolic_phase_history.patient_id 
    AND nutritionist_id = auth.uid() 
    AND status = 'active'
  )
);
