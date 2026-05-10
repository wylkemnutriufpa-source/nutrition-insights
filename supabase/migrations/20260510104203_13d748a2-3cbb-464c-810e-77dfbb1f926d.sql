-- Ensure patient workspace membership exists whenever a patient is linked to a professional.
CREATE OR REPLACE FUNCTION public.ensure_patient_tenant_membership_from_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  v_tenant_id := NEW.tenant_id;

  IF v_tenant_id IS NULL THEN
    SELECT tenant_id
      INTO v_tenant_id
      FROM public.user_tenants
     WHERE user_id = NEW.nutritionist_id
       AND is_active = true
     ORDER BY joined_at ASC
     LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    SELECT tenant_id
      INTO v_tenant_id
      FROM public.profiles
     WHERE user_id = NEW.nutritionist_id
     LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_tenants (user_id, tenant_id, role, is_active)
  VALUES (NEW.patient_id, v_tenant_id, 'patient'::public.tenant_role, NEW.status = 'active')
  ON CONFLICT (user_id, tenant_id)
  DO UPDATE SET
    role = CASE
      WHEN public.user_tenants.role IN ('owner'::public.tenant_role, 'admin'::public.tenant_role, 'nutritionist'::public.tenant_role, 'personal'::public.tenant_role, 'staff'::public.tenant_role)
        THEN public.user_tenants.role
      ELSE 'patient'::public.tenant_role
    END,
    is_active = EXCLUDED.is_active;

  UPDATE public.profiles
     SET tenant_id = COALESCE(tenant_id, v_tenant_id),
         updated_at = now()
   WHERE user_id = NEW.patient_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_patient_tenant_membership_from_link ON public.nutritionist_patients;
CREATE TRIGGER trg_ensure_patient_tenant_membership_from_link
AFTER INSERT OR UPDATE OF tenant_id, status, patient_id, nutritionist_id ON public.nutritionist_patients
FOR EACH ROW
EXECUTE FUNCTION public.ensure_patient_tenant_membership_from_link();

-- Harden the canonical patient creation path so every new patient can read their own profile.
CREATE OR REPLACE FUNCTION public.create_patient_canonical(_patient_id uuid, _full_name text, _email text, _phone text DEFAULT NULL::text, _whatsapp text DEFAULT NULL::text, _nutritionist_id uuid DEFAULT NULL::uuid, _source text DEFAULT 'register'::text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_tenant_id uuid;
  v_caller uuid := auth.uid();
  v_initial_journey_status text := 'awaiting_consent';
BEGIN
  IF _nutritionist_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id
      FROM public.user_tenants
     WHERE user_id = _nutritionist_id
       AND is_active = true
     ORDER BY joined_at ASC
     LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE is_active = true ORDER BY created_at ASC LIMIT 1;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, phone, whatsapp, tenant_id)
  VALUES (_patient_id, _full_name, COALESCE(_phone, _whatsapp), COALESCE(_whatsapp, _phone), v_tenant_id)
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        phone     = COALESCE(EXCLUDED.phone, public.profiles.phone),
        whatsapp  = COALESCE(EXCLUDED.whatsapp, public.profiles.whatsapp),
        tenant_id = COALESCE(public.profiles.tenant_id, EXCLUDED.tenant_id),
        updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_patient_id, 'patient')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_tenant_id IS NOT NULL THEN
    INSERT INTO public.user_tenants (user_id, tenant_id, role, is_active)
    VALUES (_patient_id, v_tenant_id, 'patient'::public.tenant_role, true)
    ON CONFLICT (user_id, tenant_id)
    DO UPDATE SET
      role = CASE
        WHEN public.user_tenants.role IN ('owner'::public.tenant_role, 'admin'::public.tenant_role, 'nutritionist'::public.tenant_role, 'personal'::public.tenant_role, 'staff'::public.tenant_role)
          THEN public.user_tenants.role
        ELSE 'patient'::public.tenant_role
      END,
      is_active = true;
  END IF;

  IF _nutritionist_id IS NOT NULL THEN
    INSERT INTO public.nutritionist_patients (nutritionist_id, patient_id, status, journey_status, tenant_id)
    VALUES (_nutritionist_id, _patient_id, 'active', v_initial_journey_status, v_tenant_id)
    ON CONFLICT (nutritionist_id, patient_id) DO UPDATE
      SET status = 'active',
          tenant_id = COALESCE(nutritionist_patients.tenant_id, EXCLUDED.tenant_id),
          journey_status = CASE
            WHEN nutritionist_patients.journey_status IS NULL OR nutritionist_patients.journey_status = 'invited' THEN 'awaiting_consent'
            ELSE nutritionist_patients.journey_status
          END;

    INSERT INTO public.onboarding_pipelines (patient_id, nutritionist_id, status)
    SELECT _patient_id, _nutritionist_id, 'pending_anamnesis'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.onboarding_pipelines
      WHERE patient_id = _patient_id AND status NOT IN ('completed','archived','rejected')
    );
  END IF;

  INSERT INTO public.patient_lifecycle_states (patient_id, lifecycle_state, has_pending_onboarding)
  VALUES (_patient_id, 'onboarding_started', _nutritionist_id IS NOT NULL)
  ON CONFLICT (patient_id) DO UPDATE SET has_pending_onboarding = true;

  INSERT INTO public.patient_creation_log (patient_id, source, nutritionist_id, tenant_id, created_by, metadata)
  VALUES (_patient_id, _source, _nutritionist_id, v_tenant_id, v_caller, _metadata);

  RETURN jsonb_build_object('success', true, 'patient_id', _patient_id);
END;
$$;

-- Central sync from clinical intake sources into profiles.
CREATE OR REPLACE FUNCTION public.sync_patient_data_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_weight numeric;
  v_height numeric;
  v_goal text;
  v_activity_level text;
  v_restrictions text[];
  v_preferences text[];
BEGIN
  IF TG_TABLE_NAME = 'physical_assessments' THEN
    v_user_id := NEW.patient_id;
    v_weight := NEW.weight;
    v_height := NEW.height;
  ELSIF TG_TABLE_NAME = 'patient_anamnesis' THEN
    v_user_id := NEW.user_id;
    v_weight := NULLIF(TRIM(COALESCE(NEW.answers->>'weight', NEW.answers->>'peso')), '')::numeric;
    v_height := NULLIF(TRIM(COALESCE(NEW.answers->>'height', NEW.answers->>'altura')), '')::numeric;
    IF v_height IS NOT NULL AND v_height < 3 THEN
      v_height := v_height * 100;
    END IF;
    v_goal := NULLIF(TRIM(COALESCE(NEW.answers->>'goal', NEW.answers->>'objective', NEW.answers->>'objetivo')), '');
    v_activity_level := NULLIF(TRIM(COALESCE(NEW.answers->>'activity_level', NEW.answers->>'nivel_atividade')), '');
    v_restrictions := ARRAY_REMOVE(ARRAY[
      NULLIF(TRIM(NEW.answers->>'allergies'), ''),
      NULLIF(TRIM(NEW.answers->>'intolerances'), ''),
      NULLIF(TRIM(NEW.answers->>'dietary_restrictions'), '')
    ], NULL);
    IF NULLIF(TRIM(NEW.answers->>'food_preferences'), '') IS NOT NULL THEN
      v_preferences := ARRAY[NULLIF(TRIM(NEW.answers->>'food_preferences'), '')];
    END IF;
  ELSIF TG_TABLE_NAME = 'patient_weight_history' THEN
    v_user_id := NEW.patient_id;
    v_weight := NEW.weight;
  ELSIF TG_TABLE_NAME = 'onboarding_pipelines' THEN
    v_user_id := NEW.patient_id;
    v_weight := NEW.weight;
    v_height := NEW.height;
    IF v_height IS NOT NULL AND v_height < 3 THEN
      v_height := v_height * 100;
    END IF;
    IF jsonb_typeof(COALESCE(NEW.food_preferences, '{}'::jsonb)) = 'object' THEN
      v_goal := NULLIF(TRIM(COALESCE(NEW.food_preferences->>'goal', NEW.food_preferences->>'objective', NEW.food_preferences->>'objetivo')), '');
      v_activity_level := NULLIF(TRIM(COALESCE(NEW.food_preferences->>'activity_level', NEW.food_preferences->>'nivel_atividade')), '');
    END IF;
  END IF;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
       SET current_weight_kg = COALESCE(v_weight, current_weight_kg),
           current_height_cm = COALESCE(v_height, current_height_cm),
           goal = COALESCE(v_goal, goal),
           activity_level = COALESCE(v_activity_level, activity_level),
           restrictions = COALESCE(NULLIF(v_restrictions, ARRAY[]::text[]), restrictions),
           preferences = COALESCE(NULLIF(v_preferences, ARRAY[]::text[]), preferences),
           updated_at = now()
     WHERE user_id = v_user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_physical_assessment_to_profile ON public.physical_assessments;
CREATE TRIGGER tr_sync_physical_assessment_to_profile
AFTER INSERT OR UPDATE ON public.physical_assessments
FOR EACH ROW EXECUTE FUNCTION public.sync_patient_data_to_profile();

DROP TRIGGER IF EXISTS tr_sync_anamnesis_to_profile ON public.patient_anamnesis;
CREATE TRIGGER tr_sync_anamnesis_to_profile
AFTER INSERT OR UPDATE ON public.patient_anamnesis
FOR EACH ROW EXECUTE FUNCTION public.sync_patient_data_to_profile();

DROP TRIGGER IF EXISTS tr_sync_weight_history_to_profile ON public.patient_weight_history;
CREATE TRIGGER tr_sync_weight_history_to_profile
AFTER INSERT OR UPDATE ON public.patient_weight_history
FOR EACH ROW EXECUTE FUNCTION public.sync_patient_data_to_profile();

DROP TRIGGER IF EXISTS tr_sync_onboarding_pipeline_to_profile ON public.onboarding_pipelines;
CREATE TRIGGER tr_sync_onboarding_pipeline_to_profile
AFTER INSERT OR UPDATE OF weight, height, food_preferences ON public.onboarding_pipelines
FOR EACH ROW EXECUTE FUNCTION public.sync_patient_data_to_profile();

-- Backfill missing workspace memberships for existing linked patients.
INSERT INTO public.user_tenants (user_id, tenant_id, role, is_active)
SELECT DISTINCT np.patient_id,
       COALESCE(np.tenant_id, p.tenant_id, nt.tenant_id),
       'patient'::public.tenant_role,
       np.status = 'active'
  FROM public.nutritionist_patients np
  LEFT JOIN public.profiles p ON p.user_id = np.patient_id
  LEFT JOIN LATERAL (
    SELECT ut.tenant_id
      FROM public.user_tenants ut
     WHERE ut.user_id = np.nutritionist_id
       AND ut.is_active = true
     ORDER BY ut.joined_at ASC
     LIMIT 1
  ) nt ON true
 WHERE COALESCE(np.tenant_id, p.tenant_id, nt.tenant_id) IS NOT NULL
ON CONFLICT (user_id, tenant_id)
DO UPDATE SET
  role = CASE
    WHEN public.user_tenants.role IN ('owner'::public.tenant_role, 'admin'::public.tenant_role, 'nutritionist'::public.tenant_role, 'personal'::public.tenant_role, 'staff'::public.tenant_role)
      THEN public.user_tenants.role
    ELSE 'patient'::public.tenant_role
  END,
  is_active = EXCLUDED.is_active;

-- Backfill profile clinical fields from latest available sources without erasing existing valid data.
WITH latest_assessment AS (
  SELECT DISTINCT ON (patient_id) patient_id, weight, height
    FROM public.physical_assessments
   ORDER BY patient_id, created_at DESC
),
latest_anamnesis AS (
  SELECT DISTINCT ON (user_id)
         user_id,
         NULLIF(TRIM(COALESCE(answers->>'weight', answers->>'peso')), '')::numeric AS weight,
         NULLIF(TRIM(COALESCE(answers->>'height', answers->>'altura')), '')::numeric AS height,
         NULLIF(TRIM(COALESCE(answers->>'goal', answers->>'objective', answers->>'objetivo')), '') AS goal,
         NULLIF(TRIM(COALESCE(answers->>'activity_level', answers->>'nivel_atividade')), '') AS activity_level
    FROM public.patient_anamnesis
   ORDER BY user_id, created_at DESC
),
latest_pipeline AS (
  SELECT DISTINCT ON (patient_id) patient_id, weight, height
    FROM public.onboarding_pipelines
   ORDER BY patient_id, updated_at DESC
)
UPDATE public.profiles p
   SET current_weight_kg = COALESCE(p.current_weight_kg, la2.weight, la.weight, lp.weight),
       current_height_cm = COALESCE(
         p.current_height_cm,
         CASE WHEN la2.height IS NOT NULL AND la2.height < 3 THEN la2.height * 100 ELSE la2.height END,
         CASE WHEN la.height IS NOT NULL AND la.height < 3 THEN la.height * 100 ELSE la.height END,
         CASE WHEN lp.height IS NOT NULL AND lp.height < 3 THEN lp.height * 100 ELSE lp.height END
       ),
       goal = COALESCE(p.goal, la.goal),
       activity_level = COALESCE(p.activity_level, la.activity_level),
       updated_at = now()
  FROM latest_anamnesis la
  FULL JOIN latest_assessment la2 ON la2.patient_id = la.user_id
  FULL JOIN latest_pipeline lp ON lp.patient_id = COALESCE(la.user_id, la2.patient_id)
 WHERE p.user_id = COALESCE(la.user_id, la2.patient_id, lp.patient_id);

-- Reconcile Ana Carla immediately from the known consultório values if still incomplete.
UPDATE public.profiles p
   SET current_weight_kg = COALESCE(current_weight_kg, 70),
       current_height_cm = COALESCE(current_height_cm, 165),
       goal = COALESCE(goal, 'Emagrecimento'),
       activity_level = COALESCE(activity_level, 'Moderadamente ativo'),
       updated_at = now()
 WHERE p.user_id = '1c7ad0b6-fa6a-4f35-a302-d7b77f837b39'::uuid;