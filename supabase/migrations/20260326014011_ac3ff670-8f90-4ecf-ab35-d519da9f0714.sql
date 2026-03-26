CREATE OR REPLACE FUNCTION public.auto_enable_fit_intelligence_on_prestige()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_order int;
BEGIN
  -- Only act on active prestige assignments
  IF NEW.is_active = true THEN
    SELECT display_order INTO plan_order
    FROM prestige_plans
    WHERE id = NEW.plan_id;

    -- Premium+ (display_order >= 4) auto-enables IFJ
    IF plan_order >= 4 THEN
      UPDATE profiles
      SET fit_intelligence_enabled = true,
          fit_intelligence_access_mode = COALESCE(
            (SELECT fit_intelligence_access_mode FROM profiles WHERE user_id = NEW.patient_id),
            'unlimited'
          )
      WHERE user_id = NEW.patient_id
        AND (fit_intelligence_enabled = false OR fit_intelligence_enabled IS NULL);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_enable_ifj_on_prestige ON patient_prestige;

CREATE TRIGGER trg_auto_enable_ifj_on_prestige
AFTER INSERT OR UPDATE ON patient_prestige
FOR EACH ROW
EXECUTE FUNCTION public.auto_enable_fit_intelligence_on_prestige();