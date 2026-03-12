
-- Function to promote an existing patient to a professional role (nutritionist or personal)
-- Admin-only, preserves existing patient role
CREATE OR REPLACE FUNCTION public.promote_patient_to_professional(
  _patient_email text,
  _target_role text DEFAULT 'nutritionist'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
  _full_name text;
  _app_role app_role;
  _has_patient_role boolean;
  _already_has_role boolean;
BEGIN
  -- Only admins
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can promote patients';
  END IF;

  -- Validate role
  IF _target_role NOT IN ('nutritionist', 'personal') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be nutritionist or personal', _target_role;
  END IF;
  _app_role := _target_role::app_role;

  -- Find user
  SELECT id INTO _user_id FROM auth.users WHERE email = lower(_patient_email);
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  -- Check if has patient role
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'patient') INTO _has_patient_role;
  IF NOT _has_patient_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_a_patient');
  END IF;

  -- Check if already has target role
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _app_role) INTO _already_has_role;
  IF _already_has_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_has_role');
  END IF;

  -- Add the new role (keep patient role)
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _app_role);

  -- Get name for response
  SELECT COALESCE(full_name, '') INTO _full_name FROM public.profiles WHERE user_id = _user_id;

  -- Log audit
  PERFORM public.log_audit('promote_patient', 'user', _user_id::text, 
    jsonb_build_object('email', _patient_email, 'new_role', _target_role));

  RETURN jsonb_build_object('success', true, 'user_id', _user_id, 'full_name', _full_name, 'new_role', _target_role);
END;
$function$;
