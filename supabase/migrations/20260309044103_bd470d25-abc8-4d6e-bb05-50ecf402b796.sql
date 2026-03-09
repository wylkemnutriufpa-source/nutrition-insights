
CREATE OR REPLACE FUNCTION public.create_nutritionist_account(_email text, _full_name text, _password text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Only admins can create nutritionist accounts
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can create nutritionist accounts';
  END IF;

  -- Check if user already exists
  new_user_id := (SELECT id FROM auth.users WHERE email = _email);

  IF new_user_id IS NOT NULL THEN
    -- User exists, just add nutritionist role
    INSERT INTO public.user_roles (user_id, role) VALUES (new_user_id, 'nutritionist')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN new_user_id;
  END IF;

  -- Create new user
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

  -- Add nutritionist role
  INSERT INTO public.user_roles (user_id, role) VALUES (new_user_id, 'nutritionist');

  RETURN new_user_id;
END;
$$;
