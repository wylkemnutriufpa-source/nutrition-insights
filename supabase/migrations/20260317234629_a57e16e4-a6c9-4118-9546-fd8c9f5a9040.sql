
-- =====================================================
-- SECURITY GOVERNANCE: Automated Audit RPC
-- =====================================================

-- Master security audit function (admin only)
CREATE OR REPLACE FUNCTION public.run_security_audit()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tables_no_rls jsonb;
  _permissive_policies jsonb;
  _security_definer_functions jsonb;
  _tables_summary jsonb;
  _score integer;
  _total_tables integer;
  _issues_count integer := 0;
BEGIN
  -- Only admins can run
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can run security audits';
  END IF;

  -- 1. Tables without RLS enabled
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'table', tablename,
    'severity', 'critical'
  )), '[]'::jsonb) INTO _tables_no_rls
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = t.tablename
        AND n.nspname = 'public'
        AND c.relrowsecurity = true
    );

  _issues_count := _issues_count + (SELECT count(*) FROM jsonb_array_elements(_tables_no_rls));

  -- 2. Overly permissive policies (USING true or with_check true)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'table', tablename,
    'policy', policyname,
    'command', cmd,
    'severity', 'high',
    'reason', 'Policy uses USING(true) - grants unrestricted access'
  )), '[]'::jsonb) INTO _permissive_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (qual = 'true' OR with_check = 'true');

  _issues_count := _issues_count + (SELECT count(*) FROM jsonb_array_elements(_permissive_policies));

  -- 3. SECURITY DEFINER functions (potential privilege escalation)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'function', p.proname,
    'args', pg_get_function_arguments(p.oid),
    'severity', CASE
      WHEN p.proname ILIKE '%delete%' OR p.proname ILIKE '%drop%' THEN 'high'
      WHEN p.proname ILIKE '%create%' OR p.proname ILIKE '%insert%' THEN 'medium'
      ELSE 'low'
    END
  )), '[]'::jsonb) INTO _security_definer_functions
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true;

  -- 4. Table summary with policy counts
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'table', t.tablename,
    'rls_enabled', EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
      WHERE c.relname = t.tablename AND ns.nspname = 'public' AND c.relrowsecurity = true
    ),
    'policy_count', (SELECT count(*) FROM pg_policies pp WHERE pp.tablename = t.tablename AND pp.schemaname = 'public'),
    'select_policies', (SELECT count(*) FROM pg_policies pp WHERE pp.tablename = t.tablename AND pp.schemaname = 'public' AND pp.cmd = 'SELECT'),
    'insert_policies', (SELECT count(*) FROM pg_policies pp WHERE pp.tablename = t.tablename AND pp.schemaname = 'public' AND pp.cmd = 'INSERT'),
    'update_policies', (SELECT count(*) FROM pg_policies pp WHERE pp.tablename = t.tablename AND pp.schemaname = 'public' AND pp.cmd = 'UPDATE'),
    'delete_policies', (SELECT count(*) FROM pg_policies pp WHERE pp.tablename = t.tablename AND pp.schemaname = 'public' AND pp.cmd = 'DELETE')
  ) ORDER BY t.tablename), '[]'::jsonb) INTO _tables_summary
  FROM pg_tables t
  WHERE t.schemaname = 'public';

  SELECT count(*) INTO _total_tables FROM pg_tables WHERE schemaname = 'public';

  -- Calculate score (0-100)
  _score := GREATEST(0, 100 - (_issues_count * 10));

  -- Log the audit
  PERFORM public.log_audit('security_audit_run', 'system', NULL,
    jsonb_build_object('score', _score, 'issues', _issues_count));

  RETURN jsonb_build_object(
    'score', _score,
    'total_tables', _total_tables,
    'issues_count', _issues_count,
    'tables_without_rls', _tables_no_rls,
    'permissive_policies', _permissive_policies,
    'security_definer_functions', _security_definer_functions,
    'tables_summary', _tables_summary,
    'audited_at', now()
  );
END;
$$;
