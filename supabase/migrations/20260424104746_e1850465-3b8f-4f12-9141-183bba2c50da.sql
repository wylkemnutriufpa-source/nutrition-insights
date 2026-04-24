-- Advanced filtering for system alerts
CREATE OR REPLACE FUNCTION public.get_advanced_alerts(
    p_tenant_id UUID DEFAULT NULL,
    p_alert_type TEXT DEFAULT NULL,
    p_severity TEXT DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    metadata JSONB,
    correlation_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    total_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    WITH filtered AS (
        SELECT sa.*
        FROM public.system_alerts sa
        WHERE (p_tenant_id IS NULL OR (sa.metadata->>'tenant_id')::UUID = p_tenant_id)
          AND (p_alert_type IS NULL OR sa.alert_type = p_alert_type)
          AND (p_severity IS NULL OR sa.severity = p_severity)
    )
    SELECT 
        f.id, f.alert_type, f.severity, f.message, f.metadata, f.correlation_id, f.created_at,
        (SELECT COUNT(*) FROM filtered)
    FROM filtered f
    ORDER BY f.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Dedicated reconciliation for a specific patient/window
CREATE OR REPLACE FUNCTION public.reconcile_patient_plans(
    p_patient_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT '-infinity',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT 'infinity'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_plan_id UUID;
    v_correlation_id UUID := gen_random_uuid();
    v_count INT := 0;
    v_plan_ids UUID[] := '{}';
BEGIN
    FOR v_plan_id IN 
        SELECT id FROM public.meal_plans 
        WHERE patient_id = p_patient_id
          AND created_at BETWEEN p_start_date AND p_end_date
          AND status = 'published'
    LOOP
        PERFORM public.repair_single_day_plan(v_plan_id);
        v_plan_ids := array_append(v_plan_ids, v_plan_id);
        v_count := v_count + 1;
    END LOOP;
    
    INSERT INTO public.system_alerts (alert_type, severity, message, correlation_id, metadata)
    VALUES ('MANUAL_RECONCILIATION', 'info', 'Reconciled ' || v_count || ' plans for patient ' || p_patient_id, v_correlation_id, 
           jsonb_build_object('patient_id', p_patient_id, 'plan_ids', v_plan_ids));

    RETURN jsonb_build_object(
        'success', true,
        'count', v_count,
        'correlation_id', v_correlation_id,
        'plan_ids', v_plan_ids
    );
END;
$$;

-- Metrics for plan drops (Before vs After)
CREATE OR REPLACE FUNCTION public.get_plan_drop_metrics(
    p_patient_id UUID,
    p_cutoff TIMESTAMP WITH TIME ZONE DEFAULT now() - interval '24 hours'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_before_count INT;
    v_after_count INT;
BEGIN
    SELECT COUNT(*) INTO v_before_count FROM public.meal_plans 
    WHERE patient_id = p_patient_id AND created_at < p_cutoff AND status = 'published' AND is_active = true;
    
    SELECT COUNT(*) INTO v_after_count FROM public.meal_plans 
    WHERE patient_id = p_patient_id AND created_at >= p_cutoff AND status = 'published' AND is_active = true;

    RETURN jsonb_build_object(
        'patient_id', p_patient_id,
        'before_cutoff_count', v_before_count,
        'after_cutoff_count', v_after_count,
        'diff', v_after_count - v_before_count,
        'cutoff_time', p_cutoff
    );
END;
$$;
