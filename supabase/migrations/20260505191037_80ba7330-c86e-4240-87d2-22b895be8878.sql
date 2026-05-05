-- Drop existing function with argument if it exists (to avoid overloading confusion)
DROP FUNCTION IF EXISTS public.get_user_active_tenant(uuid);

-- Recreate function without mandatory argument, using auth.uid()
CREATE OR REPLACE FUNCTION public.get_user_active_tenant()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tenant_id uuid;
  _current_user_id uuid;
BEGIN
  _current_user_id := auth.uid();
  
  IF _current_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT tenant_id INTO _tenant_id
  FROM public.user_tenants
  WHERE user_id = _current_user_id
    AND is_active = true
  ORDER BY joined_at ASC
  LIMIT 1;
  
  RETURN _tenant_id;
END;
$function$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_active_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_active_tenant() TO service_role;
