
CREATE OR REPLACE FUNCTION public.complete_invitation(_code text, _patient_user_id uuid)
RETURNS TABLE (id uuid, professional_id uuid, patient_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
BEGIN
  UPDATE public.invitations
  SET status = 'completed',
      used_at = now(),
      updated_at = now()
  WHERE code = _code
    AND status IN ('pending', 'viewed')
  RETURNING invitations.id, invitations.professional_id, invitations.patient_email
  INTO _row;

  IF _row.id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT _row.id, _row.professional_id, _row.patient_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_invitation(text, uuid) TO authenticated;
