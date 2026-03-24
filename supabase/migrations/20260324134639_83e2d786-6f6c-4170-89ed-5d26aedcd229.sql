-- Function to auto-activate onboarding for a specific patient
CREATE OR REPLACE FUNCTION public.auto_activate_patient_onboarding(_patient_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE nutritionist_patients
  SET journey_status = 'onboarding_active'
  WHERE patient_id = _patient_id
    AND status = 'active'
    AND journey_status IN ('awaiting_payment', 'awaiting_onboarding_release', 'lead_created');
  
  UPDATE profiles
  SET journey_status = 'onboarding_active'
  WHERE user_id = _patient_id
    AND (journey_status IS NULL OR journey_status IN ('invited', 'awaiting_payment', 'lead_created'));
END;
$$;

-- Trigger on booking_payments: when payment is marked as paid
CREATE OR REPLACE FUNCTION public.trg_booking_payment_activate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _patient_id uuid;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    SELECT p.user_id INTO _patient_id
    FROM profiles p
    JOIN auth.users u ON u.id = p.user_id
    WHERE u.email = NEW.customer_email
    LIMIT 1;
    
    IF _patient_id IS NOT NULL THEN
      PERFORM auto_activate_patient_onboarding(_patient_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_payment_activate ON booking_payments;
CREATE TRIGGER trg_booking_payment_activate
  AFTER INSERT OR UPDATE ON booking_payments
  FOR EACH ROW
  EXECUTE FUNCTION trg_booking_payment_activate();

-- Trigger on payments table
CREATE OR REPLACE FUNCTION public.trg_payment_activate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('paid', 'succeeded') AND (OLD.status IS NULL OR OLD.status NOT IN ('paid', 'succeeded')) THEN
    IF NEW.user_id IS NOT NULL THEN
      PERFORM auto_activate_patient_onboarding(NEW.user_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_activate ON payments;
CREATE TRIGGER trg_payment_activate
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION trg_payment_activate();

-- Trigger on patient_prestige: high prestige activates onboarding
CREATE OR REPLACE FUNCTION public.trg_prestige_activate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _display_order int;
BEGIN
  IF NEW.is_active = true THEN
    SELECT pp.display_order INTO _display_order
    FROM prestige_plans pp WHERE pp.id = NEW.plan_id;
    
    IF _display_order >= 3 THEN
      PERFORM auto_activate_patient_onboarding(NEW.patient_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prestige_activate ON patient_prestige;
CREATE TRIGGER trg_prestige_activate
  AFTER INSERT OR UPDATE ON patient_prestige
  FOR EACH ROW
  EXECUTE FUNCTION trg_prestige_activate();

-- Updated comprehensive RPC
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
    SELECT np.id, np.patient_id
    FROM nutritionist_patients np
    WHERE np.status = 'active'
      AND np.journey_status IN ('awaiting_payment', 'awaiting_onboarding_release', 'lead_created')
      AND (
        EXISTS (SELECT 1 FROM booking_payments bp WHERE bp.nutritionist_id = np.nutritionist_id AND bp.status = 'paid')
        OR EXISTS (SELECT 1 FROM payments pay WHERE pay.user_id = np.patient_id AND pay.status IN ('paid', 'succeeded'))
        OR EXISTS (SELECT 1 FROM patient_prestige ppr JOIN prestige_plans pp ON pp.id = ppr.plan_id WHERE ppr.patient_id = np.patient_id AND ppr.is_active = true AND pp.display_order >= 3)
        OR EXISTS (SELECT 1 FROM meal_plans mp WHERE mp.patient_id = np.patient_id AND mp.plan_status IN ('published_to_patient', 'approved', 'draft_auto_generated'))
      )
  LOOP
    UPDATE nutritionist_patients SET journey_status = 'onboarding_active' WHERE id = _rec.id;
    _count := _count + 1;
  END LOOP;
  RETURN jsonb_build_object('activated_count', _count);
END;
$$;