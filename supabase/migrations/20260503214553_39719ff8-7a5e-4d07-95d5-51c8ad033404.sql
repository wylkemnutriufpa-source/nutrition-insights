-- Add columns for metrics
ALTER TABLE public.meal_plan_jobs 
ADD COLUMN IF NOT EXISTS retries INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_meal_plan_jobs_status ON public.meal_plan_jobs(status);
CREATE INDEX IF NOT EXISTS idx_meal_plan_jobs_patient_id ON public.meal_plan_jobs(patient_id);

-- Drop existing view if it exists to avoid column name conflicts
DROP VIEW IF EXISTS public.meal_plan_job_metrics;

-- Recreate Metrics View
CREATE OR REPLACE VIEW public.meal_plan_job_metrics AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE status = 'completed') as avg_duration_seconds,
    (COUNT(*) FILTER (WHERE status = 'failed')::float / NULLIF(COUNT(*), 0) * 100) as failure_rate_pct,
    SUM(retries) as total_retries
FROM public.meal_plan_jobs;

-- Alerting Function
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
        id,
        patient_id,
        'Job stuck in processing for ' || EXTRACT(MINUTES FROM (now() - updated_at)) || ' minutes'
    FROM public.meal_plan_jobs
    WHERE status = 'processing' AND updated_at < (now() - interval '5 minutes');

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

-- Consistency Constraint: Only one non-finalized job per patient
-- Use partial unique index
DROP INDEX IF EXISTS idx_one_active_job_per_patient;
CREATE UNIQUE INDEX idx_one_active_job_per_patient 
ON public.meal_plan_jobs (patient_id) 
WHERE (status IN ('pending', 'processing'));

-- Grant access
GRANT SELECT ON public.meal_plan_job_metrics TO authenticated;
GRANT SELECT ON public.meal_plan_job_metrics TO service_role;
