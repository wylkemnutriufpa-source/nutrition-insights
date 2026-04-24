-- Cache table for metrics
CREATE TABLE IF NOT EXISTS public.audit_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT UNIQUE NOT NULL,
    data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Invalidation trigger function
CREATE OR REPLACE FUNCTION public.invalidate_audit_cache()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.audit_cache WHERE expires_at < now();
    -- Simple approach: clear all on plan change to ensure consistency
    DELETE FROM public.audit_cache;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_invalidate_audit_cache
AFTER INSERT OR UPDATE OR DELETE ON public.meal_plans
FOR EACH STATEMENT EXECUTE FUNCTION public.invalidate_audit_cache();

-- Refactored timeline with advanced filtering and cursor
CREATE OR REPLACE FUNCTION public.get_filtered_event_timeline(
    p_patient_id UUID DEFAULT NULL,
    p_master_item_id UUID DEFAULT NULL,
    p_plan_mode TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_cursor TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    correlation_id UUID,
    events JSONB,
    last_event_at TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    WITH all_events AS (
        SELECT 
            mp.correlation_id,
            jsonb_build_object('type', 'PLAN', 'status', mp.status, 'ts', mp.updated_at) as evt,
            mp.updated_at as ts
        FROM public.meal_plans mp 
        WHERE (p_patient_id IS NULL OR mp.patient_id = p_patient_id)
          AND (p_plan_mode IS NULL OR mp.plan_mode = p_plan_mode)
        UNION ALL
        SELECT 
            sa.correlation_id,
            jsonb_build_object('type', 'ALERT', 'alert', sa.alert_type, 'ts', sa.created_at) as evt,
            sa.created_at as ts
        FROM public.system_alerts sa 
        WHERE (p_patient_id IS NULL OR (sa.metadata->>'patient_id')::UUID = p_patient_id)
    )
    SELECT 
        ae.correlation_id,
        jsonb_agg(ae.evt ORDER BY ae.ts ASC),
        MAX(ae.ts) as max_ts
    FROM all_events ae
    WHERE ae.correlation_id IS NOT NULL
      AND (p_cursor IS NULL OR ae.ts < p_cursor)
    GROUP BY ae.correlation_id
    ORDER BY max_ts DESC
    LIMIT p_limit;
END;
$$;
