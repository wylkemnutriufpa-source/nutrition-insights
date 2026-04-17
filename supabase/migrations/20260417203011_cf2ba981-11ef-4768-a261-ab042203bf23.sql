-- ============================================================
-- RUNTIME GUARD DE PACIENTE v1.0.0
-- ============================================================

-- 1) Tabela de log de execuções do guard
CREATE TABLE IF NOT EXISTS public.runtime_patient_fixes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('ok','fixed','error')),
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  context text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_runtime_patient_fixes_patient
  ON public.runtime_patient_fixes(patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_patient_fixes_status
  ON public.runtime_patient_fixes(status, created_at DESC)
  WHERE status <> 'ok';

ALTER TABLE public.runtime_patient_fixes ENABLE ROW LEVEL SECURITY;

-- O próprio paciente pode ver seus registros
DROP POLICY IF EXISTS "patient can view own runtime fixes" ON public.runtime_patient_fixes;
CREATE POLICY "patient can view own runtime fixes"
ON public.runtime_patient_fixes
FOR SELECT
USING (auth.uid() = patient_id);

-- Admins podem ver tudo
DROP POLICY IF EXISTS "admin can view all runtime fixes" ON public.runtime_patient_fixes;
CREATE POLICY "admin can view all runtime fixes"
ON public.runtime_patient_fixes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Nutricionista vinculado pode ver registros dos seus pacientes
DROP POLICY IF EXISTS "nutritionist can view linked patient fixes" ON public.runtime_patient_fixes;
CREATE POLICY "nutritionist can view linked patient fixes"
ON public.runtime_patient_fixes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = runtime_patient_fixes.patient_id
      AND np.nutritionist_id = auth.uid()
  )
);

-- INSERT bloqueado para clientes — só via SECURITY DEFINER (a função abaixo)
DROP POLICY IF EXISTS "block direct insert" ON public.runtime_patient_fixes;
CREATE POLICY "block direct insert"
ON public.runtime_patient_fixes
FOR INSERT
WITH CHECK (false);

-- ============================================================
-- 2) Função principal: ensure_patient_ready
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_patient_ready(_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issues   jsonb := '[]'::jsonb;
  v_actions  jsonb := '[]'::jsonb;
  v_status   text  := 'ok';
  v_has_profile boolean;
  v_has_role boolean;
  v_has_lifecycle boolean;
  v_has_pipeline boolean;
  v_has_link boolean;
  v_fix_result jsonb;
  v_err text;
BEGIN
  IF _patient_id IS NULL THEN
    RETURN jsonb_build_object(
      'status','error',
      'issues', jsonb_build_array('missing_patient_id'),
      'actions','[]'::jsonb
    );
  END IF;

  -- ---- Diagnóstico ----
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = _patient_id)
    INTO v_has_profile;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _patient_id AND role = 'patient')
    INTO v_has_role;
  SELECT EXISTS(SELECT 1 FROM public.patient_lifecycle_states WHERE patient_id = _patient_id)
    INTO v_has_lifecycle;
  SELECT EXISTS(SELECT 1 FROM public.onboarding_pipelines WHERE patient_id = _patient_id)
    INTO v_has_pipeline;
  SELECT EXISTS(SELECT 1 FROM public.nutritionist_patients WHERE patient_id = _patient_id)
    INTO v_has_link;

  IF NOT v_has_profile   THEN v_issues := v_issues || jsonb_build_array('missing_profile'); END IF;
  IF NOT v_has_role      THEN v_issues := v_issues || jsonb_build_array('missing_role'); END IF;
  IF NOT v_has_lifecycle THEN v_issues := v_issues || jsonb_build_array('missing_lifecycle'); END IF;
  IF NOT v_has_pipeline  THEN v_issues := v_issues || jsonb_build_array('missing_pipeline'); END IF;
  IF NOT v_has_link      THEN v_issues := v_issues || jsonb_build_array('missing_nutritionist_link'); END IF;

  -- ---- Auto-fix se necessário ----
  IF jsonb_array_length(v_issues) > 0 THEN
    BEGIN
      v_fix_result := public.fix_patient_integrity(_patient_id);
      v_actions := v_actions || jsonb_build_array(
        jsonb_build_object('action','fix_patient_integrity','result', v_fix_result)
      );

      -- Re-validar pós-fix
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = _patient_id) INTO v_has_profile;
      SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _patient_id AND role = 'patient') INTO v_has_role;
      SELECT EXISTS(SELECT 1 FROM public.patient_lifecycle_states WHERE patient_id = _patient_id) INTO v_has_lifecycle;

      IF v_has_profile AND v_has_role AND v_has_lifecycle THEN
        v_status := 'fixed';
      ELSE
        v_status := 'error';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_err := SQLERRM;
      v_status := 'error';
      v_actions := v_actions || jsonb_build_array(
        jsonb_build_object('action','fix_failed','error', v_err)
      );
    END;
  END IF;

  -- ---- Log (best-effort) ----
  BEGIN
    INSERT INTO public.runtime_patient_fixes(patient_id, status, issues, actions, error_message)
    VALUES (_patient_id, v_status, v_issues, v_actions, v_err);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- nunca quebra o guard por log
  END;

  RETURN jsonb_build_object(
    'status', v_status,
    'issues', v_issues,
    'actions', v_actions,
    'fixed', v_status = 'fixed'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_patient_ready(uuid) TO authenticated;
