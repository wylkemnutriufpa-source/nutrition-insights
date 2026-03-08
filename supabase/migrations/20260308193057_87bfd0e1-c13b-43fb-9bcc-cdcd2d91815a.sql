
-- Create a secure function to look up a patient by email
CREATE OR REPLACE FUNCTION public.find_patient_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id FROM auth.users u
  INNER JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'patient'
  WHERE u.email = _email
  LIMIT 1
$$;
