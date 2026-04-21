-- Versioning for template_audit_rules_config: history table + auto-snapshot trigger

CREATE TABLE public.template_audit_rules_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_number BIGSERIAL NOT NULL,
  snapshot JSONB NOT NULL,
  change_summary TEXT,
  changed_rule_key TEXT,
  previous_severity TEXT,
  new_severity TEXT,
  action TEXT NOT NULL CHECK (action IN ('upsert', 'delete', 'reset', 'manual_snapshot')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_template_audit_rules_versions_created_at
  ON public.template_audit_rules_versions (created_at DESC);

ALTER TABLE public.template_audit_rules_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit rules versions"
ON public.template_audit_rules_versions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit rules versions"
ON public.template_audit_rules_versions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Helper: capture full current snapshot of the rules table as JSONB (rule_key -> severity)
CREATE OR REPLACE FUNCTION public.snapshot_template_audit_rules()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_object_agg(rule_key, severity),
    '{}'::jsonb
  )
  FROM public.template_audit_rules_config;
$$;

-- Trigger: after every change on the config table, append a version row
CREATE OR REPLACE FUNCTION public.log_template_audit_rules_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot JSONB;
  v_action TEXT;
  v_rule_key TEXT;
  v_prev TEXT;
  v_new TEXT;
  v_summary TEXT;
  v_user UUID;
BEGIN
  v_snapshot := public.snapshot_template_audit_rules();
  v_user := auth.uid();

  IF TG_OP = 'INSERT' THEN
    v_action := 'upsert';
    v_rule_key := NEW.rule_key;
    v_prev := NULL;
    v_new := NEW.severity;
    v_summary := format('Rule %s set to %s', NEW.rule_key, NEW.severity);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'upsert';
    v_rule_key := NEW.rule_key;
    v_prev := OLD.severity;
    v_new := NEW.severity;
    IF OLD.severity = NEW.severity THEN
      RETURN NEW; -- no real change
    END IF;
    v_summary := format('Rule %s changed: %s → %s', NEW.rule_key, OLD.severity, NEW.severity);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_rule_key := OLD.rule_key;
    v_prev := OLD.severity;
    v_new := NULL;
    v_summary := format('Rule %s deleted (reverted to default)', OLD.rule_key);
  END IF;

  INSERT INTO public.template_audit_rules_versions (
    snapshot, change_summary, changed_rule_key, previous_severity, new_severity, action, created_by
  ) VALUES (
    v_snapshot, v_summary, v_rule_key, v_prev, v_new, v_action, v_user
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_template_audit_rules_version
AFTER INSERT OR UPDATE OR DELETE ON public.template_audit_rules_config
FOR EACH ROW
EXECUTE FUNCTION public.log_template_audit_rules_version();

-- RPC: revert to a specific version's snapshot atomically
CREATE OR REPLACE FUNCTION public.revert_template_audit_rules_to_version(_version_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  DELETE FROM public.template_audit_rules_config;

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
$$;

-- Realtime so version list refreshes for all admins
ALTER PUBLICATION supabase_realtime ADD TABLE public.template_audit_rules_versions;