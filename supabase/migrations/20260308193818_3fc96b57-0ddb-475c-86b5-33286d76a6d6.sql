
-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recreate the function using extensions.crypt and extensions.gen_salt
CREATE OR REPLACE FUNCTION public.create_patient_account(_email text, _full_name text, _password text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'nutritionist') THEN
    RAISE EXCEPTION 'Only nutritionists can create patient accounts';
  END IF;

  new_user_id := (SELECT id FROM auth.users WHERE email = _email);

  IF new_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new_user_id, 'patient')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN new_user_id;
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    _email,
    extensions.crypt(_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', _full_name),
    now(),
    now(),
    ''
  ) RETURNING id INTO new_user_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_user_id, 'patient');

  RETURN new_user_id;
END;
$$;
