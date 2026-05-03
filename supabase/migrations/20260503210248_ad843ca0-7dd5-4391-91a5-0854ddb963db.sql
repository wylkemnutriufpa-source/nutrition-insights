-- Create the trigger function
CREATE OR REPLACE FUNCTION public.trigger_process_meal_plan_job()
RETURNS TRIGGER AS $$
DECLARE
  project_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get project URL and service role key from vault or use placeholders if you have them
  -- In Supabase, we can use the environment variables if set up, or just hardcode the URL for this project
  -- URL: https://vkrcobprntictsxqmjjl.supabase.co
  
  -- Use net.http_post from pg_net
  PERFORM
    net.http_post(
      url := 'https://vkrcobprntictsxqmjjl.supabase.co/functions/v1/process-meal-plan-jobs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('jobId', NEW.id)
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The service_role_key needs to be available in the DB settings.
-- If not, we can use a simpler approach or the user can configure it.
-- For now, I'll use a slightly different approach if net.http_post is tricky with auth.

-- Let's try to just insert into a "webhook_queue" if we have one, or just call it directly if anon access is ok.
-- Since verify_jwt = false for this function, we don't strictly need the auth header for testing, 
-- but it's better to have it.

CREATE TRIGGER process_meal_plan_job_on_insert
AFTER INSERT ON public.meal_plan_jobs
FOR EACH ROW
EXECUTE FUNCTION public.trigger_process_meal_plan_job();
