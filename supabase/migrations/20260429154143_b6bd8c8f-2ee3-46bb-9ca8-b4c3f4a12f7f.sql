CREATE OR REPLACE FUNCTION public.notify_system_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.severity IN ('CRITICAL', 'HIGH') THEN
    -- Fixed call to net.http_post with correct types and arguments
    PERFORM
      net.http_post(
        url := 'https://vkrcobprntictsxqmjjl.supabase.co/functions/v1/system-alerts',
        body := jsonb_build_object('log', row_to_json(NEW)),
        headers := jsonb_build_object('Content-Type', 'application/json')
      );
  END IF;
  RETURN NEW;
END;
$$;
