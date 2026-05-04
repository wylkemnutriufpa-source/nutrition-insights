-- Alert Configurations
CREATE TABLE IF NOT EXISTS public.job_alert_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_type TEXT NOT NULL CHECK (channel_type IN ('slack', 'discord', 'email')),
    webhook_url TEXT,
    recipient_email TEXT,
    is_active BOOLEAN DEFAULT true,
    alert_severity_threshold TEXT DEFAULT 'warning' CHECK (alert_severity_threshold IN ('info', 'warning', 'critical')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.job_alert_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins only" ON public.job_alert_configs FOR ALL USING (auth.jwt() ->> 'email' LIKE '%@wannubia.com.br');

-- Ensure audit logs have versioning
ALTER TABLE public.meal_plan_job_audit_logs 
ADD COLUMN IF NOT EXISTS engine_version TEXT,
ADD COLUMN IF NOT EXISTS plan_version TEXT;

-- Create function to notify alert system
CREATE OR REPLACE FUNCTION public.notify_job_event()
RETURNS TRIGGER AS $$
DECLARE
    v_alert_msg TEXT;
    v_payload JSONB;
BEGIN
    IF (TG_OP = 'INSERT' AND TG_TABLE_NAME = 'meal_plan_job_dead_letter') THEN
        v_alert_msg := 'CRITICAL: Job falhou permanentemente e foi para DLQ. Paciente: ' || NEW.patient_id;
        v_payload := jsonb_build_object(
            'type', 'dlq_alert',
            'severity', 'critical',
            'message', v_alert_msg,
            'job_id', NEW.job_id,
            'error', NEW.last_error
        );
        
        -- Call edge function (placeholder for actual notification logic)
        PERFORM net.http_post(
            url := (SELECT value FROM secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/system-alerts',
            headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT value FROM secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')),
            body := v_payload::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for DLQ alerts
DROP TRIGGER IF EXISTS tr_notify_dlq ON public.meal_plan_job_dead_letter;
CREATE TRIGGER tr_notify_dlq
AFTER INSERT ON public.meal_plan_job_dead_letter
FOR EACH ROW EXECUTE FUNCTION public.notify_job_event();

-- Function to export audit as JSON (for frontend to convert to CSV/PDF)
CREATE OR REPLACE FUNCTION public.export_clinical_audit(p_patient_id UUID DEFAULT NULL)
RETURNS TABLE (
    patient_name TEXT,
    action_time TIMESTAMPTZ,
    event TEXT,
    engine TEXT,
    plan TEXT,
    meta JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.full_name as patient_name,
        a.created_at as action_time,
        a.new_status || ' (' || COALESCE(a.new_step, 'init') || ')' as event,
        a.engine_version as engine,
        a.plan_version as plan,
        a.metadata as meta
    FROM public.meal_plan_job_audit_logs a
    JOIN public.profiles p ON a.patient_id = p.id
    WHERE (p_patient_id IS NULL OR a.patient_id = p_patient_id)
    ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
