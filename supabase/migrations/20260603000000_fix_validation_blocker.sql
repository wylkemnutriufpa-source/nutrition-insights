-- ════════════════════════════════════════════════════════════════════
-- CORREÇÃO CRÍTICA: Desblocar validação de planos
-- ════════════════════════════════════════════════════════════════════
-- Data: 03/06/2026
-- Problema: Validação clínica estava bloqueando publicação de planos
-- Solução: Mudar de bloqueante para consultivo
-- Filosofia: "O sistema sugere. O nutricionista decide."
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 1. TABELA: plan_validation_audits
--    Rastrear quando nutricionista ignora sugestões do sistema
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_validation_audits (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id      uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  patient_id        uuid NOT NULL,
  nutritionist_id   uuid NOT NULL,
  
  -- Resultado da validação
  validation_score  numeric NOT NULL,
  validation_passed boolean NOT NULL,  -- true se score >= 65
  
  -- Decisão do nutricionista
  published         boolean DEFAULT true,  -- sempre true aqui (pois publicou)
  ignored_suggestions boolean DEFAULT false,  -- true se score < 65 mas publicou mesmo assim
  
  -- Contexto
  recommendations   jsonb,  -- lista de sugestões que foram ignoradas
  reason_text       text,  -- motivo (opcional) — nutricionista pode documentar
  
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plan_validation_audits_nutri_idx
  ON public.plan_validation_audits (nutritionist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS plan_validation_audits_patient_idx
  ON public.plan_validation_audits (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS plan_validation_audits_ignored_idx
  ON public.plan_validation_audits (ignored_suggestions) WHERE ignored_suggestions = true;

-- ────────────────────────────────────────────────────────────────────
-- 2. RPC: publish_meal_plan_with_validation_record
--    Publicar plano e registrar na auditoria
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.publish_meal_plan_with_validation_record(
  p_plan_id uuid,
  p_patient_id uuid,
  p_nutritionist_id uuid,
  p_validation_score numeric,
  p_validation_passed boolean,
  p_recommendations jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- 1. Rastrear decisão (mesmo que score < 65, nutricionista publicou)
  INSERT INTO public.plan_validation_audits (
    meal_plan_id,
    patient_id,
    nutritionist_id,
    validation_score,
    validation_passed,
    published,
    ignored_suggestions,
    recommendations
  )
  VALUES (
    p_plan_id,
    p_patient_id,
    p_nutritionist_id,
    p_validation_score,
    p_validation_passed,
    true,
    NOT p_validation_passed,  -- true se score < 65
    p_recommendations
  );
  
  -- 2. Publicar plano
  UPDATE public.meal_plans
  SET 
    status = 'published',
    published_at = now(),
    is_published = true
  WHERE id = p_plan_id
    AND patient_id = p_patient_id;
  
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Plano publicado com sucesso',
    'plan_id', p_plan_id,
    'validation_score', p_validation_score,
    'validation_passed', p_validation_passed,
    'published_at', now()::timestamptz
  );
  
  RETURN v_result;
END;
$$;

-- ────────────────────────────────────────────────────────────────────
-- 3. Opcional: VIEW para dashboard de monitoramento
--    Visualizar quando nutricionistas ignoram sugestões
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.vw_validation_override_audit AS
SELECT
  pva.id,
  pva.nutritionist_id,
  np.name AS nutritionist_name,
  pva.patient_id,
  pva.meal_plan_id,
  pva.validation_score,
  pva.validation_passed,
  pva.ignored_suggestions,
  pva.created_at,
  -- Quantas vezes esse nutricionista ignorou sugestões nos últimos 30 dias
  (SELECT COUNT(*)
   FROM public.plan_validation_audits pva2
   WHERE pva2.nutritionist_id = pva.nutritionist_id
     AND pva2.ignored_suggestions = true
     AND pva2.created_at > now() - interval '30 days'
  ) AS overrides_last_30_days
FROM public.plan_validation_audits pva
LEFT JOIN public.professional_profiles np ON np.user_id = pva.nutritionist_id
WHERE pva.ignored_suggestions = true
ORDER BY pva.created_at DESC;

-- ────────────────────────────────────────────────────────────────────
-- 4. RLS: Garantir que auditoria seja visível apenas para admins e
--    o próprio nutricionista (para seus dados)
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE public.plan_validation_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read all audit" ON public.plan_validation_audits;
DROP POLICY IF EXISTS "Nutritionists see their own" ON public.plan_validation_audits;

CREATE POLICY "Admins and nutritionists read audit"
  ON public.plan_validation_audits FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'admin_master')
    OR nutritionist_id = auth.uid()
  );

CREATE POLICY "System inserts validation audit"
  ON public.plan_validation_audits FOR INSERT TO authenticated
  WITH CHECK (true);  -- RPC é SECURITY DEFINER, controla acesso

DO $$
BEGIN
  RAISE NOTICE 'Plan validation audit system initialized. Validation is now consultive, not bloqueante.';
END;
$$;
