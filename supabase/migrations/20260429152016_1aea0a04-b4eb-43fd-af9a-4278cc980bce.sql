-- Function to call the system-alerts edge function
CREATE OR REPLACE FUNCTION notify_system_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.severity IN ('CRITICAL', 'HIGH') THEN
    -- Using curl style via pg_net
    PERFORM
      net.http_post(
        url := 'https://vkrcobprntictsxqmjjl.supabase.co/functions/v1/system-alerts',
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object('log', row_to_json(NEW))::text
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_notify_system_alert
AFTER INSERT ON public.system_logs
FOR EACH ROW
EXECUTE FUNCTION notify_system_alert();