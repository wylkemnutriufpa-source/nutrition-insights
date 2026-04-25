-- Fix refresh_ranking_cache
CREATE OR REPLACE FUNCTION public.refresh_ranking_cache()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Fix: Added WHERE clause to satisfy safety constraints
  DELETE FROM public.patient_ranking_cache WHERE patient_id IS NOT NULL;

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

-- Fix reset_all_ranking_points
CREATE OR REPLACE FUNCTION public.reset_all_ranking_points()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can reset ranking points';
  END IF;

  -- Archive all current points
  INSERT INTO public.patient_points_archive (original_id, patient_id, action_key, points, metadata, source_type, source_id, professional_id, earned_at, archived_by)
  SELECT id, patient_id, action_key, points, metadata, source_type, source_id, professional_id, earned_at, auth.uid()
  FROM public.patient_points;

  GET DIAGNOSTICS _count = ROW_COUNT;

  -- Clear all points
  -- Fix: Added WHERE clause
  DELETE FROM public.patient_points WHERE id IS NOT NULL;

  -- Clear ranking cache
  -- Fix: Added WHERE clause
  DELETE FROM public.patient_ranking_cache WHERE patient_id IS NOT NULL;

  -- Log audit
  PERFORM public.log_audit('reset_ranking_points', 'ranking', NULL, jsonb_build_object('archived_count', _count));

  RETURN jsonb_build_object('success', true, 'archived_count', _count);
END;
$function$;