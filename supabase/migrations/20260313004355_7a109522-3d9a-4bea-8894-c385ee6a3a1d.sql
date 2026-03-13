CREATE OR REPLACE FUNCTION public.get_user_email_by_id(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT email FROM auth.users WHERE id = _user_id LIMIT 1
$$;