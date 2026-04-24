-- Audit log for exports
CREATE TABLE IF NOT EXISTS public.audit_exports_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    export_format TEXT NOT NULL,
    filter_params JSONB,
    record_count INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.audit_exports_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view export logs" ON public.audit_exports_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert export logs" ON public.audit_exports_log FOR INSERT WITH CHECK (true);

-- Stable cursor-based pagination for alerts
CREATE OR REPLACE FUNCTION public.get_advanced_alerts_paginated(
    p_tenant_id UUID DEFAULT NULL,
    p_alert_type TEXT DEFAULT NULL,
    p_severity TEXT DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_cursor_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_cursor_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    metadata JSONB,
    correlation_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    has_more BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    WITH filtered AS (
        SELECT sa.*
        FROM public.system_alerts sa
        WHERE (p_tenant_id IS NULL OR (sa.metadata->>'tenant_id')::UUID = p_tenant_id)
          AND (p_alert_type IS NULL OR sa.alert_type = p_alert_type)
          AND (p_severity IS NULL OR sa.severity = p_severity)
          AND (
            p_cursor_timestamp IS NULL OR 
            (sa.created_at < p_cursor_timestamp) OR 
            (sa.created_at = p_cursor_timestamp AND sa.id < p_cursor_id)
          )
    )
    SELECT 
        f.id, f.alert_type, f.severity, f.message, f.metadata, f.correlation_id, f.created_at,
        (SELECT COUNT(*) > p_limit FROM filtered)
    FROM filtered f
    ORDER BY f.created_at DESC, f.id DESC
    LIMIT p_limit;
END;
$$;

-- Timeline grouping by correlation_id
CREATE OR REPLACE FUNCTION public.get_patient_event_timeline(p_patient_id UUID)
RETURNS TABLE (
    correlation_id UUID,
    events JSONB,
    first_event TIMESTAMP WITH TIME ZONE,
    last_event TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    WITH all_events AS (
        SELECT 
            mp.correlation_id,
            jsonb_build_object('type', 'PLAN_STATE', 'status', mp.status, 'timestamp', mp.updated_at, 'is_active', mp.is_active) as evt,
            mp.updated_at as ts
        FROM public.meal_plans mp WHERE mp.patient_id = p_patient_id
        UNION ALL
        SELECT 
            sa.correlation_id,
            jsonb_build_object('type', 'SYSTEM_ALERT', 'alert', sa.alert_type, 'timestamp', sa.created_at, 'severity', sa.severity) as evt,
            sa.created_at as ts
        FROM public.system_alerts sa WHERE (sa.metadata->>'patient_id')::UUID = p_patient_id
    )
    SELECT 
        ae.correlation_id,
        jsonb_agg(ae.evt ORDER BY ae.ts ASC) as events,
        MIN(ae.ts) as first_event,
        MAX(ae.ts) as last_event
    FROM all_events ae
    WHERE ae.correlation_id IS NOT NULL
    GROUP BY ae.correlation_id
    ORDER BY MAX(ae.ts) DESC;
END;
$$;
