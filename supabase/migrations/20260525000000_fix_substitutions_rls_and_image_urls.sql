-- ============================================================
-- SPRINT E — Fix RLS patient_meal_substitutions + URLs de imagem
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. RLS para patient_meal_substitutions
-- A tabela existe no banco mas não tinha policies definidas.
-- Sem policies com RLS habilitado → SELECT retorna 0 linhas silenciosamente.
-- ────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.patient_meal_substitutions ENABLE ROW LEVEL SECURITY;

-- Paciente gerencia as próprias substituições
DROP POLICY IF EXISTS "Patients manage own substitutions" ON public.patient_meal_substitutions;
CREATE POLICY "Patients manage own substitutions"
  ON public.patient_meal_substitutions
  FOR ALL
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- Nutricionista lê as substituições dos seus pacientes ativos
DROP POLICY IF EXISTS "Nutritionists read patient substitutions" ON public.patient_meal_substitutions;
CREATE POLICY "Nutritionists read patient substitutions"
  ON public.patient_meal_substitutions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = patient_meal_substitutions.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

-- ────────────────────────────────────────────────────────────
-- 2. Fix URLs de imagem sem extensão nos snapshots de templates
-- 
-- O item "pao-com-ovo-tradicional" foi referenciado sem .jpg
-- em pelo menos 2 templates diferentes.
-- Esta query corrige todos os snapshots que contêm a URL errada.
-- ────────────────────────────────────────────────────────────

-- Fix em v3_diet_templates (snapshots dos templates soberanos)
UPDATE public.v3_diet_templates
SET plan_snapshot = replace(
  plan_snapshot::text,
  'meal-visual-library/pao-com-ovo-tradicional"',
  'meal-visual-library/pao-com-ovo-tradicional.jpg"'
)::jsonb
WHERE plan_snapshot::text LIKE '%meal-visual-library/pao-com-ovo-tradicional"%'
  AND plan_snapshot::text NOT LIKE '%pao-com-ovo-tradicional.jpg%';

-- Fix em meal_plans (snapshots de planos publicados que herdaram a URL errada)
UPDATE public.meal_plans
SET snapshot = replace(
  snapshot::text,
  'meal-visual-library/pao-com-ovo-tradicional"',
  'meal-visual-library/pao-com-ovo-tradicional.jpg"'
)::jsonb
WHERE snapshot IS NOT NULL
  AND snapshot::text LIKE '%meal-visual-library/pao-com-ovo-tradicional"%'
  AND snapshot::text NOT LIKE '%pao-com-ovo-tradicional.jpg%';

-- ────────────────────────────────────────────────────────────
-- 3. Índice de performance para substituições
-- Garante que a query de leitura (patient_id + meal_plan_id + created_at)
-- seja resolvida por índice e não por seq scan.
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_patient_meal_substitutions_lookup
  ON public.patient_meal_substitutions (patient_id, meal_plan_id, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 4. Verificação: contar templates e planos corrigidos
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_templates_affected int;
  v_plans_affected int;
BEGIN
  SELECT COUNT(*) INTO v_templates_affected
  FROM public.v3_diet_templates
  WHERE plan_snapshot::text LIKE '%pao-com-ovo-tradicional.jpg%';

  SELECT COUNT(*) INTO v_plans_affected
  FROM public.meal_plans
  WHERE snapshot IS NOT NULL
    AND snapshot::text LIKE '%pao-com-ovo-tradicional.jpg%';

  RAISE NOTICE 'Templates com URL corrigida: % | Planos com URL corrigida: %',
    v_templates_affected, v_plans_affected;
END;
$$;
