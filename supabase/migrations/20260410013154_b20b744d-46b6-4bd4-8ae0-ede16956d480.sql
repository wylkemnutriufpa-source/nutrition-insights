
CREATE OR REPLACE FUNCTION public.get_backup_cron_jobs()
RETURNS TABLE(job_id bigint, schedule text, command text, job_database text, username text, active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobid,
    j.schedule::text,
    j.command::text,
    j.database::text,
    j.username::text,
    j.active
  FROM cron.job j
  ORDER BY j.jobid;
EXCEPTION
  WHEN undefined_table THEN
    RETURN;
  WHEN insufficient_privilege THEN
    RETURN;
END;
$$;
