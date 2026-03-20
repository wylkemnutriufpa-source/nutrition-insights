
CREATE OR REPLACE FUNCTION public.auto_activate_onboarding_for_paid_patients()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count int := 0;
  _rec record;
BEGIN
  FOR _rec IN
    SELECT np.id, np.patient_id, np.nutritionist_id
    FROM nutritionist_patients np
    WHERE np.status = 'active'
      AND np.journey_status IN ('awaiting_payment', 'awaiting_onboarding_release', 'lead_created')
      AND (
        -- Has paid booking
        EXISTS (
          SELECT 1 FROM booking_payments bp
          WHERE bp.nutritionist_id = np.nutritionist_id
            AND bp.status = 'paid'
        )
        OR
        -- Has published meal plan
        EXISTS (
          SELECT 1 FROM meal_plans mp
          WHERE mp.patient_id = np.patient_id
            AND mp.plan_status = 'published'
        )
        OR
        -- Has an active onboarding pipeline already released
        EXISTS (
          SELECT 1 FROM onboarding_pipelines op
          WHERE op.patient_id = np.patient_id
            AND op.release_status = 'released'
        )
      )
  LOOP
    UPDATE nutritionist_patients
    SET journey_status = 'onboarding_active'
    WHERE id = _rec.id;

    INSERT INTO onboarding_pipelines (patient_id, nutritionist_id, status, release_status)
    VALUES (_rec.patient_id, _rec.nutritionist_id, 'in_progress', 'released')
    ON CONFLICT DO NOTHING;

    _count := _count + 1;
  END LOOP;

  RETURN jsonb_build_object('activated_count', _count);
END;
$$;
