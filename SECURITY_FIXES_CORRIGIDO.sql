-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECURITY FIXES — Versão corrigida (sem IF NOT EXISTS em CREATE POLICY)
-- Execute no Supabase SQL Editor
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ════════════════════════════════════════════════════════════════════
-- FIX 1: Shared meal plans — política segura com token
-- ════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Public can view shared meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Anyone can view shared plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Shared meal plans are public" ON public.meal_plans;
DROP POLICY IF EXISTS "Shared meal plans require valid token" ON public.meal_plans;

-- Apenas dono ou nutricionista acessam planos diretamente
-- Planos compartilhados via token são validados via RPC, não por policy anon
CREATE POLICY "Meal plans owner and nutritionist access"
  ON public.meal_plans FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR nutritionist_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );


-- ════════════════════════════════════════════════════════════════════
-- FIX 2: clinical_audit_logs — INSERT/SELECT restritos
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE IF EXISTS public.clinical_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Any authenticated can insert audit" ON public.clinical_audit_logs;
DROP POLICY IF EXISTS "Anyone can read telemetry" ON public.clinical_audit_logs;
DROP POLICY IF EXISTS "Authenticated can insert" ON public.clinical_audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert own audit logs" ON public.clinical_audit_logs;
DROP POLICY IF EXISTS "Only professionals read audit logs" ON public.clinical_audit_logs;

-- Qualquer autenticado pode inserir (rastreabilidade de auditoria)
CREATE POLICY "Authenticated users insert audit logs"
  ON public.clinical_audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- Apenas profissionais e admins lêem os logs
CREATE POLICY "Only professionals read audit logs"
  ON public.clinical_audit_logs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'nutritionist')
    OR public.has_role(auth.uid(), 'personal')
  );


-- ════════════════════════════════════════════════════════════════════
-- FIX 3: professional_profiles — sem leitura anônima
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE IF EXISTS public.professional_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read professional profiles" ON public.professional_profiles;
DROP POLICY IF EXISTS "Public read professional profiles" ON public.professional_profiles;
DROP POLICY IF EXISTS "Anonymous can view profiles" ON public.professional_profiles;
DROP POLICY IF EXISTS "Professional profiles: own and linked patients" ON public.professional_profiles;

CREATE POLICY "Professional profiles restricted access"
  ON public.professional_profiles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.nutritionist_id = professional_profiles.user_id
        AND np.patient_id = auth.uid()
        AND np.status = 'active'
    )
  );


-- ════════════════════════════════════════════════════════════════════
-- FIX 4: invitation_diagnostics — admin check correto
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE IF EXISTS public.invitation_diagnostics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read invitation diagnostics" ON public.invitation_diagnostics;
DROP POLICY IF EXISTS "Admins can view diagnostics" ON public.invitation_diagnostics;
DROP POLICY IF EXISTS "Only admins read invitation diagnostics" ON public.invitation_diagnostics;
DROP POLICY IF EXISTS "Nutritionists insert own invitation diagnostics" ON public.invitation_diagnostics;

CREATE POLICY "Professionals read invitation diagnostics"
  ON public.invitation_diagnostics FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'nutritionist')
    OR public.has_role(auth.uid(), 'personal')
  );

CREATE POLICY "Professionals insert invitation diagnostics"
  ON public.invitation_diagnostics FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'nutritionist')
    OR public.has_role(auth.uid(), 'personal')
    OR public.has_role(auth.uid(), 'admin')
  );


-- ════════════════════════════════════════════════════════════════════
-- FIX 5: Function Search Path Mutable — SET search_path = public
-- ════════════════════════════════════════════════════════════════════

-- has_role com search_path fixo
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role::text = _role
  );
END;
$$;

-- sync_clinical_assessment com search_path fixo
CREATE OR REPLACE FUNCTION public.sync_clinical_assessment_on_anamnesis_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE public.profiles
    SET 
      clinical_assessment_completed = true,
      onboarding_completed = true,
      patient_state = CASE 
        WHEN patient_state IN ('anamnesis', 'onboarding_slides', 'collecting_profile')
        THEN 'active_plan'
        ELSE patient_state
      END
    WHERE user_id = NEW.user_id;
    
    UPDATE public.onboarding_pipelines
    SET 
      anamnesis_completed = true,
      status = CASE 
        WHEN status = 'pending_anamnesis' THEN 'completed'
        ELSE status
      END
    WHERE patient_id = NEW.user_id
      AND status NOT IN ('completed', 'superseded_by_active_plan', 'superseded_by_published_plan');
  END IF;
  RETURN NEW;
END;
$$;

-- calculate_clinical_kcal_target com search_path fixo
CREATE OR REPLACE FUNCTION public.calculate_clinical_kcal_target(
  p_weight NUMERIC, p_height NUMERIC, p_age INTEGER,
  p_sex TEXT, p_activity TEXT, p_goal TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_tmb NUMERIC; v_get NUMERIC; v_vet NUMERIC;
  v_protein_g NUMERIC; v_fat_g NUMERIC; v_carbs_g NUMERIC;
  v_mult NUMERIC; v_adj NUMERIC;
BEGIN
  v_tmb := CASE WHEN lower(p_sex) IN ('male','masculino','m')
    THEN (10*p_weight)+(6.25*p_height)-(5*p_age)+5
    ELSE (10*p_weight)+(6.25*p_height)-(5*p_age)-161 END;

  v_mult := CASE lower(p_activity)
    WHEN 'sedentary' THEN 1.2 WHEN 'light' THEN 1.375 WHEN 'moderate' THEN 1.55
    WHEN 'active' THEN 1.725 WHEN 'very_active' THEN 1.9
    WHEN 'sedentario' THEN 1.2 WHEN 'leve' THEN 1.375 WHEN 'moderado' THEN 1.55
    WHEN 'ativo' THEN 1.725 WHEN 'muito_ativo' THEN 1.9 ELSE 1.375 END;

  v_get := v_tmb * v_mult;

  v_adj := CASE lower(p_goal)
    WHEN 'lose_weight' THEN -500 WHEN 'perda_peso' THEN -500 WHEN 'emagrecimento' THEN -500
    WHEN 'aggressive_loss' THEN -800 WHEN 'maintain' THEN 0 WHEN 'manutencao' THEN 0
    WHEN 'maintenance' THEN 0 WHEN 'gain_muscle' THEN 300 WHEN 'hipertrofia' THEN 300
    WHEN 'bulk' THEN 400 WHEN 'recomposicao' THEN 0 ELSE 0 END;

  v_vet := GREATEST(1100, LEAST(5000, ROUND(v_get + v_adj)));

  v_protein_g := ROUND(p_weight * CASE WHEN lower(p_goal) IN ('maintain','manutencao','maintenance','recomposicao') THEN 1.8 ELSE 2.0 END);
  v_fat_g := GREATEST(ROUND(p_weight * 0.6), ROUND((v_vet * 0.25) / 9));
  v_carbs_g := GREATEST(0, ROUND((v_vet - (v_protein_g*4) - (v_fat_g*9)) / 4));

  RETURN jsonb_build_object('tmb',ROUND(v_tmb),'tdee',ROUND(v_get),'kcal',v_vet,
    'protein_g',v_protein_g,'carbs_g',v_carbs_g,'fat_g',v_fat_g);
END;
$$;


-- ════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO
-- ════════════════════════════════════════════════════════════════════
SELECT tablename, rowsecurity,
  (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename) AS policies
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN ('meal_plans','professional_profiles','clinical_audit_logs','invitation_diagnostics')
ORDER BY tablename;
