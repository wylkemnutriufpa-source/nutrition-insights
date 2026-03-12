
CREATE OR REPLACE FUNCTION public.create_professional_account(_email text, _full_name text, _password text, _role text DEFAULT 'nutritionist')
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  new_user_id uuid;
  _app_role app_role;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can create professional accounts';
  END IF;

  -- Validate role
  IF _role NOT IN ('nutritionist', 'personal') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be nutritionist or personal', _role;
  END IF;
  _app_role := _role::app_role;

  new_user_id := (SELECT id FROM auth.users WHERE email = _email);

  IF new_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new_user_id, _app_role)
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

  INSERT INTO public.user_roles (user_id, role) VALUES (new_user_id, _app_role);

  RETURN new_user_id;
END;
$$;
