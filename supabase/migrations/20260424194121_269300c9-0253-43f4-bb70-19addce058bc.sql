-- 1. Função de resolução do plano alimentar do paciente (com isolamento + fallback)
CREATE OR REPLACE FUNCTION public.resolve_patient_meal_plan(
    p_patient_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan RECORD;
    v_day_of_week INT;
    v_fallback_day INT;
BEGIN
    IF p_patient_id IS NULL THEN
        RETURN NULL;
    END IF;

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'MEAL_PLAN_NOT_AUTHENTICATED' USING ERRCODE = '42501';
    END IF;

    IF auth.uid() <> p_patient_id
       AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
       AND NOT EXISTS (
           SELECT 1
           FROM public.nutritionist_patients np
           WHERE np.patient_id = p_patient_id
             AND np.nutritionist_id = auth.uid()
             AND np.status = 'active'
       ) THEN
        RAISE EXCEPTION 'MEAL_PLAN_ACCESS_DENIED' USING ERRCODE = '42501';
    END IF;

    v_day_of_week := EXTRACT(DOW FROM p_date);

    SELECT * INTO v_plan
    FROM public.meal_plans
    WHERE patient_id = p_patient_id
      AND plan_status = 'published_to_patient'
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_plan.id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT MIN(i.day_of_week) INTO v_fallback_day
    FROM public.meal_plan_items i
    WHERE i.meal_plan_id = v_plan.id
      AND i.day_of_week IS NOT NULL;

    RETURN jsonb_build_object(
        'id', v_plan.id,
        'title', v_plan.title,
        'plan_mode', v_plan.plan_mode,
        'start_date', v_plan.start_date,
        'description', v_plan.description,
        'totals_status', v_plan.totals_status,
        'items', COALESCE(
            (
                SELECT jsonb_agg(i.* ORDER BY i.created_at, i.id)
                FROM public.meal_plan_items i
                WHERE i.meal_plan_id = v_plan.id
                  AND (
                      (v_plan.plan_mode = 'single_day') OR
                      ((v_plan.plan_mode = 'weekly' OR v_plan.plan_mode IS NULL) AND i.day_of_week = v_day_of_week)
                  )
            ),
            (
                SELECT jsonb_agg(i.* ORDER BY i.created_at, i.id)
                FROM public.meal_plan_items i
                WHERE i.meal_plan_id = v_plan.id
                  AND (v_plan.plan_mode = 'weekly' OR v_plan.plan_mode IS NULL)
                  AND v_fallback_day IS NOT NULL
                  AND i.day_of_week = v_fallback_day
            ),
            '[]'::jsonb
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_patient_meal_plan(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_patient_meal_plan(UUID, DATE) TO authenticated;

-- 2. Trigger de validação de imagem (corrigido para não referenciar coluna inexistente)
CREATE OR REPLACE FUNCTION public.validate_meal_image_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_payload jsonb;
  v_recipe_id text;
BEGIN
  v_payload := to_jsonb(NEW);

  IF (v_payload ? 'image_url')
     AND v_payload->>'image_url' IS NOT NULL
     AND (v_payload ? 'recipe_id') THEN
    v_recipe_id := v_payload->>'recipe_id';
    IF v_recipe_id IS NULL OR btrim(v_recipe_id) = '' THEN
      NEW.image_url := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Trigger de versionamento (corrigido para não quebrar em UPDATE de title/description)
CREATE OR REPLACE FUNCTION public.fn_validate_and_version_meal_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_patient_id UUID;
    v_delta JSONB;
    v_payload JSONB;
BEGIN
    SELECT patient_id INTO v_patient_id FROM public.meal_plans WHERE id = NEW.meal_plan_id;
    v_payload := to_jsonb(NEW);

    IF (NEW.protein_target < 0 OR NEW.carbs_target < 0 OR NEW.fat_target < 0) THEN
        RAISE EXCEPTION 'Erro Clínico: Macros não podem ser negativos.';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.protein_target > 0 AND OLD.protein_target > 0 AND NEW.protein_target > (OLD.protein_target * 1.5) THEN
         RAISE EXCEPTION 'Bloqueio Clínico: Aumento de proteína excede limite de segurança (+50%%).';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.calories_target > 0 AND OLD.calories_target > 0 AND (ABS(NEW.calories_target - OLD.calories_target) / OLD.calories_target) > 0.2 THEN
        RAISE EXCEPTION 'Bloqueio Clínico: Variação calórica excede limite de segurança (20%%).';
    END IF;

    IF (TG_OP = 'UPDATE') THEN
        v_delta := jsonb_build_object(
            'p', COALESCE(NEW.protein_target, 0) - COALESCE(OLD.protein_target, 0),
            'c', COALESCE(NEW.carbs_target, 0) - COALESCE(OLD.carbs_target, 0),
            'f', COALESCE(NEW.fat_target, 0) - COALESCE(OLD.fat_target, 0),
            'kcal', COALESCE(NEW.calories_target, 0) - COALESCE(OLD.calories_target, 0)
        );
    END IF;

    BEGIN
        INSERT INTO public.meal_plan_item_versions (
            meal_plan_item_id,
            patient_id,
            created_by,
            action_type,
            snapshot_data
        ) VALUES (
            NEW.id,
            v_patient_id,
            auth.uid(),
            LOWER(TG_OP),
            jsonb_build_object(
                'protein_target', NEW.protein_target,
                'carbs_target', NEW.carbs_target,
                'fat_target', NEW.fat_target,
                'calories_target', NEW.calories_target,
                'description', v_payload->>'description',
                'title', v_payload->>'title',
                'metadata', COALESCE(v_payload->'metadata', '{}'::jsonb)
            )
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN NEW;
END;
$$;