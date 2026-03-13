
CREATE OR REPLACE FUNCTION public.get_patient_emails(_patient_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT u.id as user_id, u.email
  FROM auth.users u
  WHERE u.id = ANY(_patient_ids)
$$;
