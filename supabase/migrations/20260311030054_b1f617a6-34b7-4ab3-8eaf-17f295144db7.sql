UPDATE auth.users SET confirmation_token = '' WHERE confirmation_token IS NULL;
UPDATE auth.users SET recovery_token = '' WHERE recovery_token IS NULL;
UPDATE auth.users SET email_change = '' WHERE email_change IS NULL;
UPDATE auth.users SET email_change_token_new = '' WHERE email_change_token_new IS NULL;
UPDATE auth.users SET email_change_token_current = '' WHERE email_change_token_current IS NULL;
UPDATE auth.users SET reauthentication_token = '' WHERE reauthentication_token IS NULL;
UPDATE auth.users SET phone_change = '' WHERE phone_change IS NULL;
UPDATE auth.users SET phone_change_token = '' WHERE phone_change_token IS NULL;

CREATE OR REPLACE FUNCTION public.create_patient_account(_email text, _full_name text, _password text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, reauthentication_token, phone_change, phone_change_token
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
    '', '', '', '',
    '', '', '', ''
  ) RETURNING id INTO new_user_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_user_id, 'patient');

  RETURN new_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_nutritionist_account(_email text, _full_name text, _password text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can create nutritionist accounts';
  END IF;

  new_user_id := (SELECT id FROM auth.users WHERE email = _email);

  IF new_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new_user_id, 'nutritionist')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN new_user_id;
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, reauthentication_token, phone_change, phone_change_token
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
    '', '', '', '',
    '', '', '', ''
  ) RETURNING id INTO new_user_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_user_id, 'nutritionist');

  RETURN new_user_id;
END;
$function$;