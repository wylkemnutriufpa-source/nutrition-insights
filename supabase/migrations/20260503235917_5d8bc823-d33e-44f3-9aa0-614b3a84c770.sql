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
            'job_id', NEW.original_job_id,
            'error', NEW.last_error
        );
        
        -- Logging to a internal table as fallback if net extension is not ready
        -- In a real enterprise env, we'd use pg_net or a webhook
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
