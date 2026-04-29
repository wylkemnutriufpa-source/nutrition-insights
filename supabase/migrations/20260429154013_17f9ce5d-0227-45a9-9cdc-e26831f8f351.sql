-- Drop existing view
DROP VIEW IF EXISTS public.system_health_summary;

-- Create updated view that considers error_incidents governance
CREATE OR REPLACE VIEW public.system_health_summary AS
WITH incident_stats AS (
    SELECT 
        COUNT(*) AS total_incidents,
        COUNT(*) FILTER (WHERE priority = 'P0' AND status NOT IN ('resolved', 'ignored')) AS active_p0,
        COUNT(*) FILTER (WHERE priority = 'P1' AND status NOT IN ('resolved', 'ignored')) AS active_p1,
        COUNT(*) FILTER (WHERE last_occurrence > (now() - interval '1 hour')) AS fresh_incidents
    FROM public.error_incidents
),
log_stats AS (
    SELECT
        COUNT(*) AS total_errors,
        COUNT(*) FILTER (WHERE severity = 'CRITICAL'::text) AS critical_errors,
        COUNT(*) FILTER (WHERE created_at > (now() - '01:00:00'::interval)) AS errors_last_hour
    FROM public.system_logs
    WHERE created_at > (now() - '24:00:00'::interval)
)
SELECT 
    l.total_errors,
    l.critical_errors,
    l.errors_last_hour,
    CASE
        WHEN i.active_p0 > 0 THEN 'CRITICAL'::text
        WHEN i.active_p1 > 0 OR l.errors_last_hour > 20 THEN 'UNSTABLE'::text
        ELSE 'HEALTHY'::text
    END AS status,
    i.total_incidents,
    i.active_p0,
    i.active_p1
FROM log_stats l, incident_stats i;
