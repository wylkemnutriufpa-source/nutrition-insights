
-- Fix: Insert missing 'patient' roles for users who have points but no patient role
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT pp.patient_id, 'patient'::app_role
FROM public.patient_points pp
LEFT JOIN public.user_roles ur ON ur.user_id = pp.patient_id AND ur.role = 'patient'
WHERE ur.id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Also fix for all users linked as patients in nutritionist_patients
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT np.patient_id, 'patient'::app_role
FROM public.nutritionist_patients np
LEFT JOIN public.user_roles ur ON ur.user_id = np.patient_id AND ur.role = 'patient'
WHERE ur.id IS NULL AND np.status = 'active'
ON CONFLICT (user_id, role) DO NOTHING;

-- Improve refresh_ranking_cache: use points-based approach instead of requiring user_roles
CREATE OR REPLACE FUNCTION public.refresh_ranking_cache()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.patient_ranking_cache;

  INSERT INTO public.patient_ranking_cache (patient_id, total_points, display_name, avatar_url, plan_slug, plan_color, crown_enabled, badge_icon, rank_position, updated_at)
  SELECT
    pts.patient_id,
    pts.total as total_points,
    CASE
      WHEN p.show_in_ranking = true THEN COALESCE(p.full_name, 'Paciente')
      WHEN p.ranking_nickname IS NOT NULL AND p.ranking_nickname != '' THEN p.ranking_nickname
      ELSE CONCAT(LEFT(COALESCE(p.full_name, 'P'), 1), '***')
    END as display_name,
    p.avatar_url,
    COALESCE(pp2.slug, 'basic') as plan_slug,
    COALESCE(pp2.color, '#6b7280') as plan_color,
    COALESCE(pp2.crown_enabled, false) as crown_enabled,
    COALESCE(pp2.badge_icon, '⚡') as badge_icon,
    ROW_NUMBER() OVER (ORDER BY pts.total DESC) as rank_position,
    now()
  FROM (
    SELECT patient_id, SUM(points) as total FROM public.patient_points GROUP BY patient_id HAVING SUM(points) > 0
  ) pts
  LEFT JOIN public.profiles p ON p.user_id = pts.patient_id
  LEFT JOIN public.patient_prestige ppres ON ppres.patient_id = pts.patient_id AND ppres.is_active = true
  LEFT JOIN public.prestige_plans pp2 ON pp2.id = ppres.plan_id;

  -- Also refresh daily snapshot
  PERFORM public.refresh_ranking_snapshots('daily');
END;
$function$;
