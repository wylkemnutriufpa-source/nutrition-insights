-- Fix the complete_invitation RPC to correctly fetch email from auth.users
CREATE OR REPLACE FUNCTION public.complete_invitation(_code text, _patient_user_id uuid)
 RETURNS TABLE(id uuid, professional_id uuid, patient_email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_invitation record;
  v_patient_profile record;
  v_patient_email text;
  v_result jsonb;
BEGIN
  -- 1. Find and update the invitation
  UPDATE public.invitations
  SET status = 'completed',
      used_at = now(),
      updated_at = now(),
      patient_id = _patient_user_id
  WHERE code = _code
    AND (status IN ('pending', 'viewed') OR status IS NULL)
  RETURNING * INTO v_invitation;

  IF v_invitation.id IS NULL THEN
    -- Fallback: if it was already completed by the same user, just return it
    SELECT * INTO v_invitation 
    FROM public.invitations 
    WHERE code = _code AND patient_id = _patient_user_id;
    
    IF v_invitation.id IS NULL THEN
      RETURN;
    END IF;
  END IF;

  -- 2. Ensure linkage via create_patient_canonical logic
  -- We fetch the patient's existing profile data
  SELECT full_name, phone, whatsapp INTO v_patient_profile
  FROM public.profiles
  WHERE user_id = _patient_user_id;

  -- Fetch email from auth.users
  SELECT email INTO v_patient_email
  FROM auth.users
  WHERE id = _patient_user_id;

  -- Call the canonical creation/linkage function
  -- This handles: nutritionist_patients, user_roles, user_tenants, lifecycle, etc.
  SELECT public.create_patient_canonical(
    _patient_id := _patient_user_id,
    _full_name := COALESCE(v_patient_profile.full_name, v_invitation.patient_name, 'Paciente'),
    _email := COALESCE(v_patient_email, v_invitation.patient_email),
    _phone := v_patient_profile.phone,
    _whatsapp := v_patient_profile.whatsapp,
    _nutritionist_id := v_invitation.professional_id,
    _source := 'invite_completion',
    _metadata := jsonb_build_object(
      'invitation_id', v_invitation.id,
      'invitation_code', _code,
      'original_patient_name', v_invitation.patient_name,
      'original_patient_email', v_invitation.patient_email
    )
  ) INTO v_result;

  -- 3. Return the invitation data for the frontend
  RETURN QUERY SELECT v_invitation.id, v_invitation.professional_id, v_invitation.patient_email;
END;
$function$;
