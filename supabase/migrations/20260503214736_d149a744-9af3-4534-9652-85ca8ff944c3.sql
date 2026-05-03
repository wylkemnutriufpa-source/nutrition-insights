CREATE OR REPLACE FUNCTION public.check_job_anomalies()
RETURNS TABLE (
    anomaly_type TEXT,
    job_id UUID,
    patient_id UUID,
    details TEXT
) AS $$
BEGIN
    -- 1. Stuck Jobs (Processing for more than 5 minutes)
    RETURN QUERY
    SELECT 
        'stuck_job'::TEXT,
        m.id,
        m.patient_id,
        'Job stuck in processing for ' || EXTRACT(MINUTES FROM (now() - m.updated_at)) || ' minutes'
    FROM public.meal_plan_jobs m
    WHERE m.status = 'processing' AND m.updated_at < (now() - interval '5 minutes');

    -- 2. High Failure Rate (if more than 20% in last hour)
    RETURN QUERY
    WITH hourly_stats AS (
        SELECT 
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            COUNT(*) as total
        FROM public.meal_plan_jobs
        WHERE created_at > (now() - interval '1 hour')
    )
    SELECT 
        'high_failure_rate'::TEXT,
        NULL::UUID,
        NULL::UUID,
        'Failure rate at ' || (failed::float / NULLIF(total, 0) * 100) || '% in the last hour'
    FROM hourly_stats
    WHERE (failed::float / NULLIF(total, 0)) > 0.2 AND total > 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
