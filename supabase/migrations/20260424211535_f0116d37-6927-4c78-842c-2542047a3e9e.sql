-- =========================================================
-- FIX 1: RLS — incluir published_to_patient (status real)
-- =========================================================
DROP POLICY IF EXISTS "meal_plans_select_strict" ON public.meal_plans;

CREATE POLICY "meal_plans_select_strict"
ON public.meal_plans
FOR SELECT
USING (
  nutritionist_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    patient_id = auth.uid()
    AND plan_status IN ('published', 'published_to_patient')
  )
);

-- =========================================================
-- FIX 2: Trigger de bloqueio cobre published_to_patient
-- =========================================================
CREATE OR REPLACE FUNCTION public.fn_block_invalid_publication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kcal_total NUMERIC := 0;
  v_protein_total NUMERIC := 0;
  v_null_items INTEGER := 0;
  v_strict BOOLEAN;
BEGIN
  IF NEW.plan_status NOT IN ('published','published_to_patient') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.plan_status IN ('published','published_to_patient') THEN
    RETURN NEW;
  END IF;

  v_strict := public.is_feature_enabled('enable_strict_clinical_mode');
  IF NOT v_strict THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(SUM(calories_target), 0),
    COALESCE(SUM(protein_target), 0),
    COUNT(*) FILTER (WHERE calories_target IS NULL OR protein_target IS NULL)
  INTO v_kcal_total, v_protein_total, v_null_items
  FROM public.meal_plan_items
  WHERE meal_plan_id = NEW.id
    AND (is_primary = true OR is_primary IS NULL);

  IF v_kcal_total <= 0 OR v_protein_total <= 0 OR v_null_items > 0 THEN
    INSERT INTO public.clinical_audit_logs (
      patient_id, action_type, action_metadata, created_by
    ) VALUES (
      NEW.patient_id,
      'publication_blocked_invalid_macros',
      jsonb_build_object(
        'plan_id', NEW.id,
        'target_status', NEW.plan_status,
        'kcal_total', v_kcal_total,
        'protein_total', v_protein_total,
        'null_items', v_null_items
      ),
      auth.uid()
    );

    RAISE EXCEPTION 'Plano % bloqueado: macros inválidos (kcal=%, protein=%, null_items=%). Revise o plano antes de publicar.',
      NEW.id, v_kcal_total, v_protein_total, v_null_items
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;