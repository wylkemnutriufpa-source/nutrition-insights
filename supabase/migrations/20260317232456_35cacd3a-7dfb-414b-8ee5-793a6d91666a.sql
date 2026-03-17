
-- Revoke direct API access to the materialized view (accessed only via function)
REVOKE ALL ON public.mv_nutritionist_dashboard FROM anon, authenticated;
