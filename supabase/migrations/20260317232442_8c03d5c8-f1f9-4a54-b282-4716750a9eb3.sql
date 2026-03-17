
-- Search function + materialized view
CREATE OR REPLACE FUNCTION public.search_patients(_nutritionist_id uuid, _query text, _limit integer DEFAULT 20)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  avatar_url text,
  phone text,
  relevance real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.user_id,
    p.full_name,
    p.avatar_url,
    p.phone,
    CASE
      WHEN p.search_vector @@ plainto_tsquery('portuguese', _query) 
        THEN ts_rank(p.search_vector, plainto_tsquery('portuguese', _query))
      ELSE 0.1
    END::real AS relevance
  FROM public.profiles p
  INNER JOIN public.nutritionist_patients np 
    ON np.patient_id = p.user_id 
    AND np.nutritionist_id = _nutritionist_id 
    AND np.status = 'active'
  WHERE
    p.search_vector @@ plainto_tsquery('portuguese', _query)
    OR p.full_name ILIKE '%' || _query || '%'
    OR p.phone ILIKE '%' || _query || '%'
  ORDER BY relevance DESC
  LIMIT _limit;
$$;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_nutritionist_dashboard AS
SELECT
  np.nutritionist_id,
  count(DISTINCT np.patient_id)::integer AS total_patients,
  count(DISTINCT CASE WHEN ct.date = CURRENT_DATE AND ct.completed = true THEN ct.patient_id END)::integer AS patients_active_today,
  count(CASE WHEN ct.date = CURRENT_DATE AND ct.completed = true THEN 1 END)::integer AS tasks_completed_today,
  count(CASE WHEN ct.date = CURRENT_DATE THEN 1 END)::integer AS tasks_total_today,
  CASE 
    WHEN count(CASE WHEN ct.date = CURRENT_DATE THEN 1 END) > 0 
    THEN round(count(CASE WHEN ct.date = CURRENT_DATE AND ct.completed = true THEN 1 END)::numeric / count(CASE WHEN ct.date = CURRENT_DATE THEN 1 END)::numeric * 100, 1)
    ELSE 0 
  END AS checklist_completion_rate,
  count(DISTINCT CASE WHEN cm.is_read = false AND cm.receiver_id = np.nutritionist_id THEN cm.id END)::integer AS unread_messages,
  count(DISTINCT CASE WHEN ca.is_active = true AND ca.severity IN ('high', 'critical') THEN ca.id END)::integer AS critical_alerts
FROM public.nutritionist_patients np
LEFT JOIN public.checklist_tasks ct ON ct.patient_id = np.patient_id
LEFT JOIN public.chat_messages cm ON cm.sender_id = np.patient_id AND cm.receiver_id = np.nutritionist_id
LEFT JOIN public.clinical_alerts ca ON ca.patient_id = np.patient_id AND ca.nutritionist_id = np.nutritionist_id
WHERE np.status = 'active'
GROUP BY np.nutritionist_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_nutritionist_dashboard_id ON public.mv_nutritionist_dashboard(nutritionist_id);

CREATE OR REPLACE FUNCTION public.refresh_dashboard_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_nutritionist_dashboard;
END;
$$;
