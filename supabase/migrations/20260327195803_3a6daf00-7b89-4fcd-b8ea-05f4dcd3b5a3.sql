
-- Drop existing backup helper functions and recreate comprehensive ones

-- 1. Get all custom ENUM types with their values
CREATE OR REPLACE FUNCTION public.get_backup_enums()
RETURNS TABLE(enum_name text, create_statement text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec RECORD;
  vals text;
BEGIN
  FOR rec IN
    SELECT t.typname,
           string_agg(e.enumlabel, ''', ''' ORDER BY e.enumsortorder) AS labels
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typnamespace = 'public'::regnamespace
    GROUP BY t.typname
    ORDER BY t.typname
  LOOP
    enum_name := rec.typname;
    create_statement := 'CREATE TYPE public.' || quote_ident(rec.typname) || ' AS ENUM (''' || rec.labels || ''')';
    RETURN NEXT;
  END LOOP;
END;
$$;

-- 2. Get all extensions used
CREATE OR REPLACE FUNCTION public.get_backup_extensions()
RETURNS TABLE(ext_name text, create_statement text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT e.extname::text,
         ('CREATE EXTENSION IF NOT EXISTS ' || quote_ident(e.extname) || ' WITH SCHEMA ' || quote_ident(n.nspname))::text
  FROM pg_extension e
  JOIN pg_namespace n ON e.extnamespace = n.oid
  WHERE e.extname NOT IN ('plpgsql')
  ORDER BY e.extname;
END;
$$;

-- 3. Get all constraints (PK, FK, UNIQUE, CHECK)
CREATE OR REPLACE FUNCTION public.get_backup_constraints()
RETURNS TABLE(table_name text, constraint_name text, constraint_type text, create_statement text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.table_name::text,
    tc.constraint_name::text,
    tc.constraint_type::text,
    ('ALTER TABLE public.' || quote_ident(tc.table_name) || ' ADD CONSTRAINT ' || quote_ident(tc.constraint_name) || ' ' ||
      pg_get_constraintdef(pgc.oid))::text
  FROM information_schema.table_constraints tc
  JOIN pg_constraint pgc ON pgc.conname = tc.constraint_name
  JOIN pg_namespace pn ON pn.oid = pgc.connamespace AND pn.nspname = 'public'
  WHERE tc.table_schema = 'public'
    AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'CHECK')
  ORDER BY
    CASE tc.constraint_type
      WHEN 'PRIMARY KEY' THEN 1
      WHEN 'UNIQUE' THEN 2
      WHEN 'CHECK' THEN 3
      WHEN 'FOREIGN KEY' THEN 4
    END,
    tc.table_name, tc.constraint_name;
END;
$$;

-- 4. Get all indexes (excluding PK/unique which are handled by constraints)
CREATE OR REPLACE FUNCTION public.get_backup_indexes()
RETURNS TABLE(table_name text, index_name text, create_statement text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pi.tablename::text,
    pi.indexname::text,
    pi.indexdef::text
  FROM pg_indexes pi
  WHERE pi.schemaname = 'public'
    AND pi.indexname NOT IN (
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
    )
  ORDER BY pi.tablename, pi.indexname;
END;
$$;

-- 5. Get all functions (excluding backup helpers themselves)
CREATE OR REPLACE FUNCTION public.get_backup_functions()
RETURNS TABLE(func_name text, create_statement text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.proname::text,
    pg_get_functiondef(p.oid)::text
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace
    AND p.proname NOT LIKE 'get_backup_%'
  ORDER BY p.proname;
END;
$$;

-- 6. Get all triggers
CREATE OR REPLACE FUNCTION public.get_backup_triggers()
RETURNS TABLE(table_name text, trigger_name text, create_statement text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::text,
    t.tgname::text,
    pg_get_triggerdef(t.oid)::text
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND NOT t.tgisinternal
  ORDER BY c.relname, t.tgname;
END;
$$;

-- 7. Get all RLS policies
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
     CASE WHEN p.roles IS NOT NULL AND p.roles != '{}'::text[] THEN ' TO ' || array_to_string(p.roles, ', ') ELSE '' END ||
     CASE WHEN p.qual IS NOT NULL THEN ' USING (' || p.qual || ')' ELSE '' END ||
     CASE WHEN p.with_check IS NOT NULL THEN ' WITH CHECK (' || p.with_check || ')' ELSE '' END
    )::text
  FROM pg_policies p
  WHERE p.schemaname = 'public'
  ORDER BY p.tablename, p.policyname;
END;
$$;

-- 8. Get tables with RLS enabled
CREATE OR REPLACE FUNCTION public.get_backup_rls_enabled()
RETURNS TABLE(table_name text, rls_statement text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::text,
    ('ALTER TABLE public.' || quote_ident(c.relname) || ' ENABLE ROW LEVEL SECURITY')::text
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
  ORDER BY c.relname;
END;
$$;
