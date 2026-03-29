CREATE OR REPLACE FUNCTION public.log_audit(
  _action text,
  _resource_type text,
  _resource_id text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, tenant_id, action, resource_type, resource_id, metadata)
  VALUES (
    auth.uid(),
    COALESCE(public.get_user_tenant(), '00000000-0000-0000-0000-000000000000'::uuid),
    _action,
    _resource_type,
    _resource_id,
    _metadata
  );
END;
$$;