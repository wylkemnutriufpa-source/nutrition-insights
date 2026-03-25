
-- Update push trigger to pass skip_inapp flag to avoid duplicate in-app notifications
CREATE OR REPLACE FUNCTION public.trigger_push_on_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _push_types text[] := ARRAY[
    'onboarding_released',
    'plan_published',
    'payment_confirmed',
    'anamnesis_submitted',
    'onboarding_completed',
    'feedback_received',
    'checkin_photo',
    'patient_invited'
  ];
  _has_subscription boolean;
BEGIN
  IF NEW.type = ANY(_push_types) THEN
    SELECT EXISTS(
      SELECT 1 FROM public.push_subscriptions WHERE user_id = NEW.user_id LIMIT 1
    ) INTO _has_subscription;

    IF _has_subscription THEN
      PERFORM net.http_post(
        url := 'https://vkrcobprntictsxqmjjl.supabase.co/functions/v1/send-push-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcmNvYnBybnRpY3RzeHFtampsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODgzNjAsImV4cCI6MjA4ODU2NDM2MH0.7EeitVFMX1oFdtDCZpw7t1c6G5gnKjnvOhuScZ83VjU"}'::jsonb,
        body := jsonb_build_object(
          'user_id', NEW.user_id,
          'title', NEW.title,
          'body', coalesce(NEW.message, ''),
          'url', coalesce(NEW.target_route, '/'),
          'tag', concat('fitjourney-', NEW.type),
          'skip_inapp', true
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
