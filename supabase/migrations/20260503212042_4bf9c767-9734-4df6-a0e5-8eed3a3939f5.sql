-- Add metrics view
CREATE OR REPLACE VIEW public.meal_plan_job_metrics AS
SELECT 
    count(*) FILTER (WHERE status = 'completed') as successful_jobs,
    count(*) FILTER (WHERE status = 'failed') as failed_jobs,
    avg(EXTRACT(EPOCH FROM (updated_at - created_at))) FILTER (WHERE status = 'completed') as avg_duration_seconds,
    (count(*) FILTER (WHERE status = 'failed')::float / NULLIF(count(*), 0) * 100) as failure_rate_percentage
FROM public.meal_plan_jobs;

-- Developer dashboard function
CREATE OR REPLACE FUNCTION public.get_meal_plan_job_debug_info()
RETURNS TABLE (
    id uuid,
    patient_id uuid,
    status text,
    current_step text,
    error text,
    duration_seconds float,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.id,
        j.patient_id,
        j.status,
        j.current_step,
        j.error,
        EXTRACT(EPOCH FROM (j.updated_at - j.created_at)) as duration_seconds,
        j.created_at
    FROM public.meal_plan_jobs j
    ORDER BY j.created_at DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic Consistency Trigger
-- Ensure that when a job completes, the pipeline and patient state are in sync
CREATE OR REPLACE FUNCTION public.sync_meal_plan_job_to_pipeline()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'completed' AND OLD.status != 'completed') THEN
        -- Verify pipeline consistency
        UPDATE public.onboarding_pipelines
        SET 
            plan_generated = true,
            status = 'pending_approval',
            updated_at = now()
        WHERE patient_id = NEW.patient_id
        AND plan_generated = false;
        
        -- Sync patient journey state if needed
        -- This logic usually lives in app, but putting safety check here
        UPDATE public.patient_states
        SET 
            journey_status = 'awaiting_approval',
            updated_at = now()
        WHERE id = NEW.patient_id
        AND journey_status IN ('anamnesis_completed', 'onboarding');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_job_completion
AFTER UPDATE ON public.meal_plan_jobs
FOR EACH ROW
EXECUTE FUNCTION public.sync_meal_plan_job_to_pipeline();
