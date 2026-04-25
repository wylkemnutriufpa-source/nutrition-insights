CREATE OR REPLACE FUNCTION public.save_plan_as_approved(_plan_id uuid, _nutritionist_id uuid)
RETURNS jsonb AS $$
BEGIN
  UPDATE public.meal_plans
  SET plan_status = CASE 
        WHEN plan_status = 'published_to_patient' THEN 'published_to_patient'
        WHEN plan_status = 'published' THEN 'published_to_patient'
        ELSE 'approved'
      END,
      overall_validation_status = 'aprovado',
      updated_at = now()
  WHERE id = _plan_id 
    AND (nutritionist_id = _nutritionist_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _nutritionist_id AND role = 'admin'));

  RETURN jsonb_build_object('success', true, 'plan_id', _plan_id);
END;
$$ LANGUAGE plpgsql;
