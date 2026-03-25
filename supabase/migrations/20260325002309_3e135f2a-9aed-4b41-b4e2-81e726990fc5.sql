
-- Trigger: auto-send push notification when critical in-app notifications are created
CREATE OR REPLACE FUNCTION public.trigger_push_on_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _supabase_url text;
  _service_key text;
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
  -- Only fire for important notification types
  IF NEW.type = ANY(_push_types) THEN
    -- Check if user has push subscriptions
    SELECT EXISTS(
      SELECT 1 FROM public.push_subscriptions WHERE user_id = NEW.user_id LIMIT 1
    ) INTO _has_subscription;

    IF _has_subscription THEN
      _supabase_url := current_setting('app.settings.supabase_url', true);
      
      -- Use pg_net to call the send-push-notification edge function
      PERFORM net.http_post(
        url := concat(
          coalesce(
            _supabase_url,
            'https://vkrcobprntictsxqmjjl.supabase.co'
          ),
          '/functions/v1/send-push-notification'
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', concat('Bearer ', coalesce(
            current_setting('app.settings.anon_key', true),
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcmNvYnBybnRpY3RzeHFtampsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODgzNjAsImV4cCI6MjA4ODU2NDM2MH0.7EeitVFMX1oFdtDCZpw7t1c6G5gnKjnvOhuScZ83VjU'
          ))
        ),
        body := jsonb_build_object(
          'user_id', NEW.user_id,
          'title', NEW.title,
          'body', coalesce(NEW.message, ''),
          'url', coalesce(NEW.target_route, '/'),
          'tag', concat('fitjourney-', NEW.type)
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_on_notification ON public.notifications;
CREATE TRIGGER trg_push_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_on_notification();
