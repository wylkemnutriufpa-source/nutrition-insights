
-- ═══════════════════════════════════════════════════════════════
-- AUDITORIA & BACKFILL SEGURO DE PACIENTES — v1.0.0
-- Diagnóstico + correções automáticas (sem refatorar fluxos)
-- ═══════════════════════════════════════════════════════════════

-- 1. Tabela de log da auditoria (se não existir)
CREATE TABLE IF NOT EXISTS public.patient_data_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  patient_id uuid,
  issue_type text NOT NULL,
  action_taken text NOT NULL,
  details jsonb,
  status text NOT NULL DEFAULT 'fixed'
);

ALTER TABLE public.patient_data_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit log" ON public.patient_data_audit_log;
CREATE POLICY "Admins can view audit log"
  ON public.patient_data_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "System can insert audit log" ON public.patient_data_audit_log;
CREATE POLICY "System can insert audit log"
  ON public.patient_data_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Função normalizadora oficial — single source of truth
CREATE OR REPLACE FUNCTION public.normalize_patient_data(_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actions jsonb := '[]'::jsonb;
  v_email text;
  v_name text;
  v_tenant uuid;
  v_link_count int;
  v_lifecycle_exists boolean;
  v_nutritionist_id uuid;
BEGIN
  -- Get auth data
  SELECT email, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1))
    INTO v_email, v_name
  FROM auth.users WHERE id = _patient_id;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('status', 'orphan_user', 'patient_id', _patient_id);
  END IF;

  -- (a) Backfill profile full_name if empty
  UPDATE public.profiles
     SET full_name = COALESCE(NULLIF(TRIM(full_name), ''), v_name, 'Paciente')
   WHERE user_id = _patient_id
     AND (full_name IS NULL OR TRIM(full_name) = '');
  IF FOUND THEN
    v_actions := v_actions || jsonb_build_object('action', 'backfilled_full_name', 'value', v_name);
  END IF;

  -- (b) Resolve tenant from existing link or profile
  SELECT tenant_id INTO v_tenant FROM public.profiles WHERE user_id = _patient_id;

  -- (c) Find nutritionist link
  SELECT nutritionist_id INTO v_nutritionist_id
    FROM public.nutritionist_patients
   WHERE patient_id = _patient_id
   ORDER BY created_at DESC LIMIT 1;

  -- (d) Backfill lifecycle if missing AND patient has a link
  SELECT EXISTS(SELECT 1 FROM public.patient_lifecycle_states WHERE patient_id = _patient_id)
    INTO v_lifecycle_exists;

  IF NOT v_lifecycle_exists AND v_nutritionist_id IS NOT NULL THEN
    INSERT INTO public.patient_lifecycle_states (
      patient_id, lifecycle_state, has_pending_onboarding, computed_at, updated_at
    ) VALUES (
      _patient_id,
      'onboarding_started'::patient_lifecycle_status,
      true, now(), now()
    )
    ON CONFLICT (patient_id) DO NOTHING;
    v_actions := v_actions || jsonb_build_object('action', 'created_lifecycle', 'state', 'onboarding_started');
  END IF;

  RETURN jsonb_build_object(
    'status', 'normalized',
    'patient_id', _patient_id,
    'has_link', v_nutritionist_id IS NOT NULL,
    'tenant_id', v_tenant,
    'actions', v_actions
  );
END;
$$;

-- 3. Função de auditoria global — diagnóstico + correções
CREATE OR REPLACE FUNCTION public.run_patient_data_audit(_dry_run boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int := 0;
  v_fixed_names int := 0;
  v_fixed_lifecycle int := 0;
  v_orphans_no_link int := 0;
  v_unfixable int := 0;
  v_patient record;
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can run patient data audit';
  END IF;

  FOR v_patient IN
    SELECT DISTINCT ur.user_id AS patient_id
      FROM public.user_roles ur
     WHERE ur.role = 'patient'
  LOOP
    v_total := v_total + 1;

    IF _dry_run THEN
      -- Diagnóstico apenas
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_patient.patient_id AND TRIM(COALESCE(full_name,'')) <> '') THEN
        v_fixed_names := v_fixed_names + 1;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.patient_lifecycle_states WHERE patient_id = v_patient.patient_id) THEN
        IF EXISTS (SELECT 1 FROM public.nutritionist_patients WHERE patient_id = v_patient.patient_id) THEN
          v_fixed_lifecycle := v_fixed_lifecycle + 1;
        ELSE
          v_orphans_no_link := v_orphans_no_link + 1;
        END IF;
      END IF;
    ELSE
      v_result := public.normalize_patient_data(v_patient.patient_id);

      IF v_result->>'status' = 'orphan_user' THEN
        v_unfixable := v_unfixable + 1;
        INSERT INTO public.patient_data_audit_log (patient_id, issue_type, action_taken, status, details)
          VALUES (v_patient.patient_id, 'orphan_auth_user', 'flagged', 'unfixable', v_result);
      ELSIF jsonb_array_length(v_result->'actions') > 0 THEN
        IF v_result->'actions'::text LIKE '%backfilled_full_name%' THEN
          v_fixed_names := v_fixed_names + 1;
        END IF;
        IF v_result->'actions'::text LIKE '%created_lifecycle%' THEN
          v_fixed_lifecycle := v_fixed_lifecycle + 1;
        END IF;
        INSERT INTO public.patient_data_audit_log (patient_id, issue_type, action_taken, status, details)
          VALUES (v_patient.patient_id, 'data_inconsistency', 'normalized', 'fixed', v_result);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM public.nutritionist_patients WHERE patient_id = v_patient.patient_id) THEN
        v_orphans_no_link := v_orphans_no_link + 1;
        INSERT INTO public.patient_data_audit_log (patient_id, issue_type, action_taken, status, details)
          VALUES (v_patient.patient_id, 'no_nutritionist_link', 'flagged', 'requires_manual_review',
                  jsonb_build_object('reason', 'patient role exists but no nutritionist_patients row'));
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'dry_run', _dry_run,
    'total_patients', v_total,
    'backfilled_names', v_fixed_names,
    'created_lifecycle_states', v_fixed_lifecycle,
    'orphans_without_link', v_orphans_no_link,
    'unfixable', v_unfixable,
    'completed_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_patient_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_patient_data_audit(boolean) TO authenticated;

-- 4. Limpeza imediata: remover role 'patient' incorretamente atribuída ao nutricionista owner
DELETE FROM public.user_roles
 WHERE role = 'patient'
   AND user_id IN (
     SELECT user_id FROM public.user_roles WHERE role IN ('admin','nutritionist')
   );

-- 5. Limpeza: remover lifecycles órfãos (sem nenhum vínculo nutricionista E sem role patient)
DELETE FROM public.patient_lifecycle_states
 WHERE patient_id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'patient');
