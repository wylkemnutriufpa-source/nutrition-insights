-- Function to check which emails already exist as patients for a nutritionist
CREATE OR REPLACE FUNCTION public.find_existing_patient_emails(_emails text[], _nutritionist_id uuid)
RETURNS TABLE(email text, already_linked boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    lower(u.email) as email,
    EXISTS(
      SELECT 1 FROM public.nutritionist_patients np 
      WHERE np.patient_id = u.id AND np.nutritionist_id = _nutritionist_id AND np.status = 'active'
    ) as already_linked
  FROM auth.users u
  WHERE lower(u.email) = ANY(SELECT lower(unnest(_emails)))
$$;

-- Function to fix NULL tokens for a specific user
CREATE OR REPLACE FUNCTION public.fix_user_null_tokens(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE auth.users SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    reauthentication_token = COALESCE(reauthentication_token, ''),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, '')
  WHERE id = _user_id;
END;
$$;

-- Function to fix ALL NULL tokens
CREATE OR REPLACE FUNCTION public.fix_all_null_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE auth.users SET 
    confirmation_token = '' WHERE confirmation_token IS NULL;
  UPDATE auth.users SET 
    recovery_token = '' WHERE recovery_token IS NULL;
  UPDATE auth.users SET 
    email_change = '' WHERE email_change IS NULL;
  UPDATE auth.users SET 
    email_change_token_new = '' WHERE email_change_token_new IS NULL;
  UPDATE auth.users SET 
    email_change_token_current = '' WHERE email_change_token_current IS NULL;
  UPDATE auth.users SET 
    reauthentication_token = '' WHERE reauthentication_token IS NULL;
  UPDATE auth.users SET 
    phone_change = '' WHERE phone_change IS NULL;
  UPDATE auth.users SET 
    phone_change_token = '' WHERE phone_change_token IS NULL;
END;
$$;

-- Add unique constraint on nutritionist_patients if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nutritionist_patients_unique_link'
  ) THEN
    ALTER TABLE public.nutritionist_patients 
    ADD CONSTRAINT nutritionist_patients_unique_link 
    UNIQUE (nutritionist_id, patient_id);
  END IF;
END $$;