
-- Update sync_program_prestige to respect higher-tier prestige plans
-- Patients with Premium/Pro (semestral/anual) prestige should NOT be downgraded
CREATE OR REPLACE FUNCTION public.sync_program_prestige(_program_id uuid, _assigned_by uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _prestige_plan_id uuid;
  _program_display_order integer;
  _count integer := 0;
  _skipped integer := 0;
  _patient record;
  _current_display_order integer;
BEGIN
  -- Get the program's prestige plan and its display_order
  SELECT p.prestige_plan_id, pp.display_order
  INTO _prestige_plan_id, _program_display_order
  FROM public.programs p
  LEFT JOIN public.prestige_plans pp ON pp.id = p.prestige_plan_id
  WHERE p.id = _program_id;

  IF _prestige_plan_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_prestige_plan_linked');
  END IF;

  -- For each active enrollee, assign prestige only if they don't have a higher one
  FOR _patient IN
    SELECT patient_id FROM public.program_enrollments
    WHERE program_id = _program_id AND status NOT IN ('cancelled', 'dropped_out')
  LOOP
    -- Check current active prestige display_order
    SELECT pp.display_order INTO _current_display_order
    FROM public.patient_prestige pt
    JOIN public.prestige_plans pp ON pp.id = pt.plan_id
    WHERE pt.patient_id = _patient.patient_id AND pt.is_active = true
    LIMIT 1;

    -- Only assign if patient has NO prestige or current prestige is LOWER tier
    IF _current_display_order IS NULL OR _current_display_order < _program_display_order THEN
      -- Deactivate existing prestige (it's lower)
      UPDATE public.patient_prestige SET is_active = false
      WHERE patient_id = _patient.patient_id AND is_active = true;

      -- Assign new prestige
      INSERT INTO public.patient_prestige (patient_id, plan_id, assigned_by, is_active)
      VALUES (_patient.patient_id, _prestige_plan_id, _assigned_by, true)
      ON CONFLICT DO NOTHING;

      _count := _count + 1;
    ELSE
      -- Patient already has equal or higher prestige, skip
      _skipped := _skipped + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'patients_updated', _count,
    'patients_skipped', _skipped,
    'prestige_plan_id', _prestige_plan_id
  );
END;
$$;

-- Update auto_assign_program_prestige trigger to respect higher-tier prestige
CREATE OR REPLACE FUNCTION public.auto_assign_program_prestige()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _prestige_plan_id uuid;
  _program_display_order integer;
  _current_display_order integer;
  _existing_id uuid;
BEGIN
  -- Only on insert or status change to active
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status NOT IN ('cancelled', 'dropped_out') AND (OLD.status IN ('cancelled', 'dropped_out') OR OLD.status IS NULL)) THEN
    -- Get the program's prestige plan and its tier
    SELECT p.prestige_plan_id, pp.display_order
    INTO _prestige_plan_id, _program_display_order
    FROM public.programs p
    LEFT JOIN public.prestige_plans pp ON pp.id = p.prestige_plan_id
    WHERE p.id = NEW.program_id;

    IF _prestige_plan_id IS NOT NULL THEN
      -- Check if already has this exact prestige active
      SELECT id INTO _existing_id
      FROM public.patient_prestige
      WHERE patient_id = NEW.patient_id AND plan_id = _prestige_plan_id AND is_active = true;

      IF _existing_id IS NULL THEN
        -- Check current prestige tier
        SELECT pp.display_order INTO _current_display_order
        FROM public.patient_prestige pt
        JOIN public.prestige_plans pp ON pp.id = pt.plan_id
        WHERE pt.patient_id = NEW.patient_id AND pt.is_active = true
        LIMIT 1;

        -- Only assign if no current prestige or current is lower tier
        IF _current_display_order IS NULL OR _current_display_order < _program_display_order THEN
          -- Deactivate old (lower) prestige
          UPDATE public.patient_prestige SET is_active = false
          WHERE patient_id = NEW.patient_id AND is_active = true;

          -- Assign program prestige
          INSERT INTO public.patient_prestige (patient_id, plan_id, assigned_by, is_active)
          VALUES (NEW.patient_id, _prestige_plan_id, COALESCE(NEW.professional_id, auth.uid()), true);
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
