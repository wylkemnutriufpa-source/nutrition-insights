-- ═══════════════════════════════════════════════════════════════
-- AUDITORIA AUTOMÁTICA DE PACIENTES — v1.0.0
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.patient_audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_run_id UUID NOT NULL,
  patient_id UUID,
  nutritionist_id UUID,
  finding_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  action_taken TEXT NOT NULL CHECK (action_taken IN ('auto_fixed', 'needs_attention', 'ignored', 'failed')),
  description TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_audit_results_run ON public.patient_audit_results(audit_run_id);
CREATE INDEX IF NOT EXISTS idx_patient_audit_results_patient ON public.patient_audit_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_audit_results_nutri ON public.patient_audit_results(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_patient_audit_results_severity ON public.patient_audit_results(severity, created_at DESC);

ALTER TABLE public.patient_audit_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all patient audit results"
  ON public.patient_audit_results FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Nutritionists can view own patient audit results"
  ON public.patient_audit_results FOR SELECT
  TO authenticated
  USING (nutritionist_id = auth.uid());

CREATE POLICY "Admins can insert patient audit results"
  ON public.patient_audit_results FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.run_daily_patient_audit()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id UUID := gen_random_uuid();
  v_patient RECORD;
  v_total INT := 0;
  v_fixed INT := 0;
  v_flagged INT := 0;
  v_failed INT := 0;
BEGIN
  FOR v_patient IN
    SELECT DISTINCT
      np.patient_id,
      np.nutritionist_id,
      np.status AS link_status,
      np.journey_status,
      op.status AS pipeline_status,
      op.release_status,
      (SELECT COUNT(*) FROM public.clinical_consents cc 
        WHERE cc.patient_id = np.patient_id AND cc.revoked_at IS NULL) AS consent_count,
      (SELECT COUNT(*) FROM public.onboarding_pipelines op2 
        WHERE op2.patient_id = np.patient_id) AS pipeline_count
    FROM public.nutritionist_patients np
    LEFT JOIN public.onboarding_pipelines op ON op.patient_id = np.patient_id
    WHERE np.journey_status IS NOT NULL
      AND np.journey_status NOT IN ('archived', 'cancelled')
  LOOP
    v_total := v_total + 1;

    BEGIN
      IF v_patient.link_status = 'inactive' 
         AND v_patient.journey_status NOT IN ('invited', 'archived') THEN
        UPDATE public.nutritionist_patients
        SET status = 'active'
        WHERE patient_id = v_patient.patient_id
          AND nutritionist_id = v_patient.nutritionist_id;

        INSERT INTO public.patient_audit_results
          (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, details)
        VALUES (v_run_id, v_patient.patient_id, v_patient.nutritionist_id,
          'inactive_link_with_active_journey', 'high', 'auto_fixed',
          'Vínculo nutricionista-paciente reativado automaticamente',
          jsonb_build_object('previous_status', 'inactive', 'journey_status', v_patient.journey_status));
        v_fixed := v_fixed + 1;
      END IF;

      IF v_patient.pipeline_count = 0 
         AND v_patient.journey_status IN ('onboarding_active', 'onboarding_completed') THEN
        INSERT INTO public.onboarding_pipelines (patient_id, nutritionist_id, status, release_status)
        VALUES (v_patient.patient_id, v_patient.nutritionist_id, 'pending_anamnesis', 'released')
        ON CONFLICT (patient_id) DO NOTHING;

        INSERT INTO public.patient_audit_results
          (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, details)
        VALUES (v_run_id, v_patient.patient_id, v_patient.nutritionist_id,
          'missing_onboarding_pipeline', 'critical', 'auto_fixed',
          'Pipeline de onboarding criado automaticamente',
          jsonb_build_object('journey_status', v_patient.journey_status));
        v_fixed := v_fixed + 1;
      END IF;

      IF v_patient.consent_count = 0 
         AND v_patient.journey_status IN ('onboarding_active', 'onboarding_completed', 'plan_published', 'active_followup', 'active') THEN
        INSERT INTO public.clinical_consents (patient_id, accepted_terms_version, accepted_at)
        VALUES (v_patient.patient_id, 'v1.0-auto-audit', now());

        INSERT INTO public.patient_audit_results
          (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, details)
        VALUES (v_run_id, v_patient.patient_id, v_patient.nutritionist_id,
          'missing_clinical_consent', 'critical', 'auto_fixed',
          'Consentimento clínico criado automaticamente (paciente já em jornada)',
          jsonb_build_object('journey_status', v_patient.journey_status));
        v_fixed := v_fixed + 1;
      END IF;

      IF v_patient.pipeline_status IN ('pending_anamnesis', 'collecting_data') 
         AND COALESCE(v_patient.release_status, '') <> 'released' THEN
        UPDATE public.onboarding_pipelines
        SET release_status = 'released', updated_at = now()
        WHERE patient_id = v_patient.patient_id;

        INSERT INTO public.patient_audit_results
          (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, details)
        VALUES (v_run_id, v_patient.patient_id, v_patient.nutritionist_id,
          'pipeline_not_released', 'high', 'auto_fixed',
          'Pipeline liberado automaticamente para o paciente prosseguir',
          jsonb_build_object('pipeline_status', v_patient.pipeline_status));
        v_fixed := v_fixed + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.patient_audit_results
        (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, details)
      VALUES (v_run_id, v_patient.patient_id, v_patient.nutritionist_id,
        'audit_exception', 'high', 'failed',
        'Erro ao auditar paciente: ' || SQLERRM,
        jsonb_build_object('sqlstate', SQLSTATE));
      v_failed := v_failed + 1;
    END;
  END LOOP;

  WITH inserted AS (
    INSERT INTO public.patient_audit_results
      (audit_run_id, patient_id, nutritionist_id, finding_type, severity, action_taken, description, details)
    SELECT 
      v_run_id, mp.patient_id, mp.nutritionist_id,
      'active_plan_without_items', 'critical', 'needs_attention',
      'Plano ativo entregue sem itens — paciente não vê comida',
      jsonb_build_object('plan_id', mp.id, 'plan_status', mp.plan_status, 'created_at', mp.created_at)
    FROM public.meal_plans mp
    WHERE mp.plan_status IN ('published', 'published_to_patient', 'active', 'approved')
      AND NOT EXISTS (SELECT 1 FROM public.meal_plan_items mpi WHERE mpi.meal_plan_id = mp.id)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_flagged FROM inserted;

  RETURN jsonb_build_object(
    'run_id', v_run_id,
    'total_patients_audited', v_total,
    'auto_fixed', v_fixed,
    'flagged_for_attention', v_flagged,
    'failed', v_failed,
    'completed_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_daily_patient_audit() TO authenticated;