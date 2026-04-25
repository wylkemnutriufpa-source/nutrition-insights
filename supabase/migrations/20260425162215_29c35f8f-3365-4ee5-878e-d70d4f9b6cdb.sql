-- 1. Fix public.revert_template_audit_rules_to_version
CREATE OR REPLACE FUNCTION public.revert_template_audit_rules_to_version(_version_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_snapshot JSONB;
  v_key TEXT;
  v_severity TEXT;
  v_user UUID;
  v_new_snapshot JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can revert audit rules';
  END IF;

  SELECT snapshot INTO v_snapshot
  FROM public.template_audit_rules_versions
  WHERE id = _version_id;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Version % not found', _version_id;
  END IF;

  v_user := auth.uid();

  -- Surgical removal: Only keys NOT present in the target version
  DELETE FROM public.template_audit_rules_config 
  WHERE rule_key NOT IN (SELECT key FROM jsonb_each_text(v_snapshot));

  -- Surgical update/insert: Synchronize current rules with snapshot
  FOR v_key, v_severity IN SELECT * FROM jsonb_each_text(v_snapshot) LOOP
    INSERT INTO public.template_audit_rules_config (rule_key, severity, updated_by, updated_at)
    VALUES (v_key, v_severity, v_user, now())
    ON CONFLICT (rule_key) DO UPDATE SET 
      severity = EXCLUDED.severity,
      updated_by = EXCLUDED.updated_by,
      updated_at = EXCLUDED.updated_at;
  END LOOP;

  v_new_snapshot := public.snapshot_template_audit_rules();

  INSERT INTO public.template_audit_rules_versions (
    snapshot, change_summary, action, created_by
  ) VALUES (
    v_new_snapshot,
    format('Reverted to version %s', _version_id),
    'manual_snapshot',
    v_user
  );

  RETURN v_new_snapshot;
END;
$function$;

-- 2. Fix public.refresh_ranking_cache
CREATE OR REPLACE FUNCTION public.refresh_ranking_cache()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Clear ranking for actual profiles (real filter instead of global delete)
  DELETE FROM public.patient_ranking_cache 
  WHERE patient_id IN (SELECT user_id FROM public.profiles);

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

  PERFORM public.refresh_ranking_snapshots('daily');
END;
$function$;

-- 3. Fix public.reset_all_ranking_points
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

  INSERT INTO public.patient_points_archive (original_id, patient_id, action_key, points, metadata, source_type, source_id, professional_id, earned_at, archived_by)
  SELECT id, patient_id, action_key, points, metadata, source_type, source_id, professional_id, earned_at, auth.uid()
  FROM public.patient_points;

  GET DIAGNOSTICS _count = ROW_COUNT;

  -- Use real patient filters for reset instead of global delete
  DELETE FROM public.patient_points 
  WHERE patient_id IN (SELECT user_id FROM public.profiles);

  DELETE FROM public.patient_ranking_cache 
  WHERE patient_id IN (SELECT user_id FROM public.profiles);

  PERFORM public.log_audit('reset_ranking_points', 'ranking', NULL, jsonb_build_object('archived_count', _count));

  RETURN jsonb_build_object('success', true, 'archived_count', _count);
END;
$function$;

-- 4. Fix public.invalidate_audit_cache
-- Add plan_id column to enable specific deletions
ALTER TABLE public.audit_cache ADD COLUMN IF NOT EXISTS plan_id UUID;

CREATE OR REPLACE FUNCTION public.invalidate_audit_cache()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_plan_id UUID;
BEGIN
    -- Clear expired items first (valid filter)
    DELETE FROM public.audit_cache WHERE expires_at < now();
    
    -- Clear specific plan cache (real filter)
    v_plan_id := COALESCE(NEW.id, OLD.id);
    IF v_plan_id IS NOT NULL THEN
        DELETE FROM public.audit_cache WHERE plan_id = v_plan_id;
    END IF;
    
    RETURN NULL;
END;
$function$;

-- Update trigger from STATEMENT to ROW level to provide context for specific deletion
DROP TRIGGER IF EXISTS tr_invalidate_audit_cache ON public.meal_plans;
CREATE TRIGGER tr_invalidate_audit_cache
AFTER INSERT OR UPDATE OR DELETE ON public.meal_plans
FOR EACH ROW EXECUTE FUNCTION public.invalidate_audit_cache();
