
CREATE OR REPLACE FUNCTION public.get_user_tenant()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.user_tenants
  WHERE user_id = auth.uid()
  ORDER BY joined_at ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.user_tenants
  WHERE user_id = _user_id
  ORDER BY joined_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant(uuid) TO authenticated;
