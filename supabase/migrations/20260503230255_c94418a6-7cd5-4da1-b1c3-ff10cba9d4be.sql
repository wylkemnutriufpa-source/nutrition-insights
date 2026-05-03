-- 1. Add versioning columns
ALTER TABLE public.meal_plan_jobs 
ADD COLUMN IF NOT EXISTS engine_version TEXT DEFAULT '2.0.0',
ADD COLUMN IF NOT EXISTS plan_version TEXT DEFAULT '1.0.0';

-- 2. Create Clinical Audit Logs table
CREATE TABLE IF NOT EXISTS public.meal_plan_job_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.meal_plan_jobs(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.profiles(id),
    previous_status TEXT,
    new_status TEXT,
    previous_step TEXT,
    new_step TEXT,
    error_details TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID DEFAULT auth.uid()
);

ALTER TABLE public.meal_plan_job_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs" 
ON public.meal_plan_job_audit_logs FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'nutritionist')));

-- 3. Create Dead Letter Queue table
CREATE TABLE IF NOT EXISTS public.meal_plan_job_dead_letter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_job_id UUID,
    patient_id UUID REFERENCES public.profiles(id),
    payload JSONB,
    last_error TEXT,
    retries_at_failure INTEGER,
    failure_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID DEFAULT auth.uid(),
    resolution_notes TEXT,
    engine_version TEXT,
    plan_version TEXT
);

ALTER TABLE public.meal_plan_job_dead_letter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage DLQ" 
ON public.meal_plan_job_dead_letter FOR ALL 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'nutritionist')));

-- 4. Audit Trigger Function
CREATE OR REPLACE FUNCTION public.audit_meal_plan_job_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.current_step IS DISTINCT FROM NEW.current_step)) THEN
        INSERT INTO public.meal_plan_job_audit_logs (
            job_id, patient_id, previous_status, new_status, previous_step, new_step, error_details, metadata
        ) VALUES (
            NEW.id, NEW.patient_id, OLD.status, NEW.status, OLD.current_step, NEW.current_step, NEW.error, 
            jsonb_build_object('retries', NEW.retries, 'engine_version', NEW.engine_version)
        );
        
        -- If it failed after retries, move to DLQ
        IF (NEW.status = 'failed' AND OLD.status != 'failed') THEN
            INSERT INTO public.meal_plan_job_dead_letter (
                original_job_id, patient_id, payload, last_error, retries_at_failure, engine_version, plan_version
            ) VALUES (
                NEW.id, NEW.patient_id, NEW.payload, NEW.error, NEW.retries, NEW.engine_version, NEW.plan_version
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_audit_meal_plan_job ON public.meal_plan_jobs;
CREATE TRIGGER tr_audit_meal_plan_job
AFTER UPDATE ON public.meal_plan_jobs
FOR EACH ROW EXECUTE FUNCTION public.audit_meal_plan_job_transition();

-- 5. System Health & Alerts RPC
CREATE OR REPLACE FUNCTION public.check_job_system_health()
RETURNS void AS $$
DECLARE
    stuck_jobs_count INTEGER;
    failure_rate_percentage NUMERIC;
    total_recent_jobs INTEGER;
    failed_recent_jobs INTEGER;
BEGIN
    -- Count stuck jobs (processing for more than 5 minutes)
    SELECT count(*) INTO stuck_jobs_count
    FROM public.meal_plan_jobs
    WHERE status = 'processing' 
    AND updated_at < (now() - interval '5 minutes');

    IF stuck_jobs_count > 0 THEN
        INSERT INTO public.system_alerts (
            title, description, severity, category, metadata
        ) VALUES (
            'Jobs Travados Detectados',
            'Existem ' || stuck_jobs_count || ' jobs em processamento por mais de 5 minutos.',
            'high',
            'jobs',
            jsonb_build_object('stuck_count', stuck_jobs_count)
        );
    END IF;

    -- Failure Rate threshold (e.g., > 20% in the last hour)
    SELECT count(*) INTO total_recent_jobs
    FROM public.meal_plan_jobs
    WHERE created_at > (now() - interval '1 hour');

    IF total_recent_jobs > 10 THEN
        SELECT count(*) INTO failed_recent_jobs
        FROM public.meal_plan_jobs
        WHERE status = 'failed' AND created_at > (now() - interval '1 hour');

        failure_rate_percentage := (failed_recent_jobs::numeric / total_recent_jobs::numeric) * 100;

        IF failure_rate_percentage > 20 THEN
            INSERT INTO public.system_alerts (
                title, description, severity, category, metadata
            ) VALUES (
                'Taxa de Falha Elevada',
                'A taxa de falha nos últimos 60 minutos é de ' || round(failure_rate_percentage, 1) || '%.',
                'critical',
                'jobs',
                jsonb_build_object('failure_rate', failure_rate_percentage, 'failed_count', failed_recent_jobs)
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Manual Reprocessing Function
CREATE OR REPLACE FUNCTION public.reprocess_dead_letter_job(dlq_id UUID)
RETURNS UUID AS $$
DECLARE
    v_patient_id UUID;
    v_payload JSONB;
    v_engine_version TEXT;
    v_plan_version TEXT;
    new_job_id UUID;
BEGIN
    SELECT patient_id, payload, engine_version, plan_version 
    INTO v_patient_id, v_payload, v_engine_version, v_plan_version
    FROM public.meal_plan_job_dead_letter
    WHERE id = dlq_id;

    -- Ensure no active job for this patient
    IF EXISTS (SELECT 1 FROM public.meal_plan_jobs WHERE patient_id = v_patient_id AND status IN ('pending', 'processing')) THEN
        RAISE EXCEPTION 'Paciente já possui um job ativo.';
    END IF;

    -- Create new job
    INSERT INTO public.meal_plan_jobs (
        patient_id, payload, status, engine_version, plan_version
    ) VALUES (
        v_patient_id, v_payload, 'pending', v_engine_version, v_plan_version
    ) RETURNING id INTO new_job_id;

    -- Mark DLQ as resolved
    UPDATE public.meal_plan_job_dead_letter
    SET resolved = TRUE,
        resolved_at = now(),
        resolved_by = auth.uid(),
        resolution_notes = 'Reprocessado manualmente. Novo Job ID: ' || new_job_id
    WHERE id = dlq_id;

    RETURN new_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
