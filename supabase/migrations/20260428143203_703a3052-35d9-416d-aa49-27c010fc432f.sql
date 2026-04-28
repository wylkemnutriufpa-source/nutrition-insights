-- Add new columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='correlation_id') THEN
    ALTER TABLE public.audit_logs ADD COLUMN correlation_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='status') THEN
    ALTER TABLE public.audit_logs ADD COLUMN status TEXT;
  END IF;
END $$;

-- Drop existing functions to avoid ambiguity
DROP FUNCTION IF EXISTS public.log_audit(text, text, text, jsonb);

-- Recreate with new signature
CREATE OR REPLACE FUNCTION public.log_audit(
  _action text, 
  _resource_type text, 
  _resource_id text DEFAULT NULL::text, 
  _metadata jsonb DEFAULT '{}'::jsonb,
  _correlation_id text DEFAULT NULL::text,
  _status text DEFAULT NULL::text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, tenant_id, action, resource_type, resource_id, metadata, correlation_id, status)
  VALUES (
    auth.uid(),
    COALESCE(public.get_user_tenant(), '00000000-0000-0000-0000-000000000000'::uuid),
    _action,
    _resource_type,
    _resource_id,
    _metadata,
    _correlation_id,
    _status
  );
END;
$$;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION public.log_audit TO public;
GRANT EXECUTE ON FUNCTION public.log_audit TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit TO anon;