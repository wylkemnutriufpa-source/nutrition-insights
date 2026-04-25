-- Correcting revert_template_audit_rules_to_version to include safety WHERE clause
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

  -- Wipe current rules then re-apply the snapshot. Trigger will log each change.
  -- Added WHERE clause for safety
  DELETE FROM public.template_audit_rules_config WHERE rule_key IS NOT NULL;

  FOR v_key, v_severity IN SELECT * FROM jsonb_each_text(v_snapshot) LOOP
    INSERT INTO public.template_audit_rules_config (rule_key, severity, updated_by, updated_at)
    VALUES (v_key, v_severity, v_user, now());
  END LOOP;

  v_new_snapshot := public.snapshot_template_audit_rules();

  -- Append a clear "revert" marker version on top
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