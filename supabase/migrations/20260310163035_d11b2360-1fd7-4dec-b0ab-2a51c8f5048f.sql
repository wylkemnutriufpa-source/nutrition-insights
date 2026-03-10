
-- Function to get ranking by period with category breakdowns
-- Periods: 'daily', 'weekly', 'monthly', 'annual', 'all'
CREATE OR REPLACE FUNCTION public.get_ranking_by_period(
  _period text DEFAULT 'monthly',
  _limit int DEFAULT 20
)
RETURNS TABLE(
  patient_id uuid,
  display_name text,
  avatar_url text,
  plan_slug text,
  plan_color text,
  crown_enabled boolean,
  badge_icon text,
  total_points bigint,
  rank_position bigint,
  points_checklist bigint,
  points_meals bigint,
  points_training bigint,
  points_checkin bigint,
  points_other bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH period_filter AS (
    SELECT CASE
      WHEN _period = 'daily' THEN (now() - interval '1 day')
      WHEN _period = 'weekly' THEN (now() - interval '7 days')
      WHEN _period = 'monthly' THEN (now() - interval '30 days')
      WHEN _period = 'annual' THEN (now() - interval '365 days')
      ELSE '1970-01-01'::timestamptz
    END AS since
  ),
  point_sums AS (
    SELECT
      pp.patient_id,
      COALESCE(SUM(pp.points), 0) AS total_points,
      COALESCE(SUM(CASE WHEN pp.action_key ILIKE '%checklist%' OR pp.action_key ILIKE '%task%' THEN pp.points ELSE 0 END), 0) AS points_checklist,
      COALESCE(SUM(CASE WHEN pp.action_key ILIKE '%meal%' OR pp.action_key ILIKE '%diet%' OR pp.action_key ILIKE '%food%' THEN pp.points ELSE 0 END), 0) AS points_meals,
      COALESCE(SUM(CASE WHEN pp.action_key ILIKE '%training%' OR pp.action_key ILIKE '%exercise%' OR pp.action_key ILIKE '%workout%' THEN pp.points ELSE 0 END), 0) AS points_training,
      COALESCE(SUM(CASE WHEN pp.action_key ILIKE '%checkin%' THEN pp.points ELSE 0 END), 0) AS points_checkin,
      COALESCE(SUM(CASE WHEN 
        pp.action_key NOT ILIKE '%checklist%' AND pp.action_key NOT ILIKE '%task%'
        AND pp.action_key NOT ILIKE '%meal%' AND pp.action_key NOT ILIKE '%diet%' AND pp.action_key NOT ILIKE '%food%'
        AND pp.action_key NOT ILIKE '%training%' AND pp.action_key NOT ILIKE '%exercise%' AND pp.action_key NOT ILIKE '%workout%'
        AND pp.action_key NOT ILIKE '%checkin%'
      THEN pp.points ELSE 0 END), 0) AS points_other
    FROM patient_points pp, period_filter pf
    WHERE pp.earned_at >= pf.since
    GROUP BY pp.patient_id
    HAVING SUM(pp.points) > 0
  ),
  ranked AS (
    SELECT
      ps.*,
      ROW_NUMBER() OVER (ORDER BY ps.total_points DESC) AS rank_position
    FROM point_sums ps
  )
  SELECT
    r.patient_id,
    COALESCE(p.full_name, 'Paciente') AS display_name,
    p.avatar_url,
    pp_plan.slug AS plan_slug,
    pp_plan.color AS plan_color,
    pp_plan.crown_enabled,
    pp_plan.badge_icon,
    r.total_points,
    r.rank_position,
    r.points_checklist,
    r.points_meals,
    r.points_training,
    r.points_checkin,
    r.points_other
  FROM ranked r
  LEFT JOIN profiles p ON p.user_id = r.patient_id
  LEFT JOIN patient_prestige ppres ON ppres.patient_id = r.patient_id AND ppres.is_active = true
  LEFT JOIN prestige_plans pp_plan ON pp_plan.id = ppres.plan_id
  WHERE r.rank_position <= _limit
  ORDER BY r.rank_position;
$$;
