-- Add correlation_id for traceability
ALTER TABLE public.meal_plans ADD COLUMN IF NOT EXISTS correlation_id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.system_alerts ADD COLUMN IF NOT EXISTS correlation_id UUID;

-- Improved diagnostics including IDs
CREATE OR REPLACE FUNCTION public.get_detailed_plan_diagnostics(p_patient_id UUID)
RETURNS TABLE (
    plan_id UUID,
    tenant_id UUID,
    status TEXT,
    plan_mode TEXT,
    is_active BOOLEAN,
    correlation_id UUID,
    created_at TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mp.id,
        mp.tenant_id,
        mp.status,
        mp.plan_mode,
        mp.is_active,
        mp.correlation_id,
        mp.created_at
    FROM public.meal_plans mp
    WHERE mp.patient_id = p_patient_id
    ORDER BY mp.created_at DESC;
END;
$$;

-- Idempotent publication with locking to prevent race conditions
CREATE OR REPLACE FUNCTION public.publish_meal_plan_v2(
    p_plan_id UUID,
    p_correlation_id UUID DEFAULT gen_random_uuid()
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_lock_acquired BOOLEAN;
    v_result JSONB;
BEGIN
    -- Acquire advisory lock based on plan_id hash to prevent concurrent publication
    SELECT pg_try_advisory_xact_lock(hashtext(p_plan_id::text)) INTO v_lock_acquired;
    
    IF NOT v_lock_acquired THEN
        RETURN jsonb_build_object('success', false, 'error', 'Concurrent publication in progress');
    END IF;

    -- Update plan status with correlation_id
    UPDATE public.meal_plans
    SET 
        status = 'published',
        is_active = true,
        correlation_id = p_correlation_id,
        updated_at = now()
    WHERE id = p_plan_id
    AND status != 'published'; -- Idempotency check

    GET DIAGNOSTICS v_result = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true, 
        'modified', v_result, 
        'correlation_id', p_correlation_id
    );
END;
$$;
