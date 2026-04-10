-- Fix the type mismatch bug in get_backup_rls_policies (name[] != text[] fails)
CREATE OR REPLACE FUNCTION public.get_backup_rls_policies()
RETURNS TABLE(table_name text, policy_name text, create_statement text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.tablename::text,
    p.policyname::text,
    ('CREATE POLICY ' || quote_ident(p.policyname) || ' ON public.' || quote_ident(p.tablename) ||
     ' AS ' || CASE WHEN p.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END ||
     ' FOR ' || p.cmd ||
     CASE WHEN p.roles IS NOT NULL AND array_length(p.roles, 1) > 0 THEN ' TO ' || array_to_string(p.roles::text[], ', ') ELSE '' END ||
     CASE WHEN p.qual IS NOT NULL THEN ' USING (' || p.qual || ')' ELSE '' END ||
     CASE WHEN p.with_check IS NOT NULL THEN ' WITH CHECK (' || p.with_check || ')' ELSE '' END
    )::text
  FROM pg_policies p
  WHERE p.schemaname = 'public'
  ORDER BY p.tablename, p.policyname;
END;
$$;

-- Add views backup function
CREATE OR REPLACE FUNCTION public.get_backup_views()
RETURNS TABLE(view_name text, create_statement text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::text,
    ('CREATE OR REPLACE VIEW public.' || quote_ident(c.relname) || ' AS ' || pg_get_viewdef(c.oid, true))::text
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND c.relkind = 'v'
  ORDER BY c.relname;
END;
$$;