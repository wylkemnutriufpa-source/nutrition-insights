-- Function to fail stuck jobs
CREATE OR REPLACE FUNCTION public.fail_stuck_meal_plan_jobs()
RETURNS void AS $$
BEGIN
    UPDATE public.meal_plan_jobs
    SET 
        status = 'failed',
        error = 'Tempo limite de processamento atingido (timeout)'
    WHERE 
        status = 'processing' 
        AND updated_at < now() - interval '2 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to prevent multiple active jobs per patient
CREATE OR REPLACE FUNCTION public.check_active_meal_plan_job()
RETURNS TRIGGER AS $$
BEGIN
    -- First, fail any stuck jobs to release the lock if they were abandoned
    PERFORM public.fail_stuck_meal_plan_jobs();

    IF EXISTS (
        SELECT 1 FROM public.meal_plan_jobs 
        WHERE patient_id = NEW.patient_id 
        AND status IN ('pending', 'processing')
        AND id != NEW.id
    ) THEN
        RAISE EXCEPTION 'Já existe um processamento em andamento para este paciente.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_concurrent_meal_plan_jobs
BEFORE INSERT ON public.meal_plan_jobs
FOR EACH ROW
EXECUTE FUNCTION public.check_active_meal_plan_job();
