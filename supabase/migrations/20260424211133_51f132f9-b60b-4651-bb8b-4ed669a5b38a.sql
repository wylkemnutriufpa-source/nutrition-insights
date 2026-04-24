-- =========================================================
-- ETAPA 1: RLS estrita em meal_plans
-- =========================================================

-- Remover policy permissiva que sobrescrevia a restrição de drafts
DROP POLICY IF EXISTS "Nutritionists and patients can view meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "patients_no_drafts" ON public.meal_plans;

-- Policy unificada e correta:
-- - nutricionista vê todos os seus planos (qualquer status)
-- - admin vê tudo
-- - paciente vê APENAS seus planos com status published
CREATE POLICY "meal_plans_select_strict"
ON public.meal_plans
FOR SELECT
USING (
  nutritionist_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    patient_id = auth.uid()
    AND plan_status = 'published'
  )
);

-- =========================================================
-- ETAPA 2: Bloqueio de publicação com macros NULL/zero
-- =========================================================

-- Feature flag (configurável)
CREATE TABLE IF NOT EXISTS public.system_feature_flags (
  flag_key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_flags_admin_all" ON public.system_feature_flags;
CREATE POLICY "feature_flags_admin_all"
ON public.system_feature_flags
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "feature_flags_authenticated_read" ON public.system_feature_flags;
CREATE POLICY "feature_flags_authenticated_read"
ON public.system_feature_flags
FOR SELECT
TO authenticated
USING (true);

INSERT INTO public.system_feature_flags (flag_key, enabled, description)
VALUES ('enable_strict_clinical_mode', true, 'Bloqueia publicação de planos com macros NULL/zero')
ON CONFLICT (flag_key) DO NOTHING;

-- Função auxiliar
CREATE OR REPLACE FUNCTION public.is_feature_enabled(_flag TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.system_feature_flags WHERE flag_key = _flag),
    false
  );
$$;

-- Trigger: ao tentar publicar, validar que macros existem
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
  -- Só atua na transição PARA published
  IF NEW.plan_status <> 'published' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.plan_status = 'published' THEN
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
    -- Auditoria
    INSERT INTO public.clinical_audit_logs (
      patient_id, action_type, action_metadata, created_by
    ) VALUES (
      NEW.patient_id,
      'publication_blocked_invalid_macros',
      jsonb_build_object(
        'plan_id', NEW.id,
        'kcal_total', v_kcal_total,
        'protein_total', v_protein_total,
        'null_items', v_null_items,
        'reason', 'strict_clinical_mode_block'
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

DROP TRIGGER IF EXISTS tr_block_invalid_publication ON public.meal_plans;
CREATE TRIGGER tr_block_invalid_publication
BEFORE INSERT OR UPDATE OF plan_status ON public.meal_plans
FOR EACH ROW
EXECUTE FUNCTION public.fn_block_invalid_publication();

-- =========================================================
-- ETAPA 3: Imagens — remover Strategy 3 (partial match)
-- =========================================================
CREATE OR REPLACE FUNCTION public.auto_resolve_visual_library_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _norm TEXT;
  _match UUID;
  _word TEXT;
  _protein_base TEXT;
BEGIN
  -- Skip if already set or no title
  IF NEW.visual_library_item_id IS NOT NULL OR NEW.title IS NULL OR trim(NEW.title) = '' THEN
    RETURN NEW;
  END IF;

  _norm := lower(trim(
    regexp_replace(
      regexp_replace(
        translate(lower(trim(NEW.title)),
          'àáâãäåèéêëìíîïòóôõöùúûüýÿñç',
          'aaaaaaeeeeiiiioooooouuuuyync'),
        '[^a-z0-9 ]', '', 'g'),
      '\s+', ' ', 'g')
  ));

  -- Strategy 1: alias EXATO (única estratégia confiável)
  SELECT mva.library_item_id INTO _match
  FROM public.meal_visual_aliases mva
  JOIN public.meal_visual_library mvl ON mvl.id = mva.library_item_id AND mvl.is_active = true
  WHERE mva.normalized_alias = _norm
  LIMIT 1;

  IF _match IS NOT NULL THEN
    NEW.visual_library_item_id := _match;
    RETURN NEW;
  END IF;

  -- Strategy 2: proteína explícita (apenas alias EXATO da proteína)
  FOR _word IN SELECT unnest(string_to_array(_norm, ' '))
  LOOP
    IF _word IN ('arroz','batata','macarrao','feijao','pure','mandioca','inhame','legumes','salada','de','com','e','da','do') THEN
      CONTINUE;
    END IF;

    _protein_base := CASE _word
      WHEN 'frango' THEN 'frango'
      WHEN 'carne' THEN 'carne'
      WHEN 'bife' THEN 'carne'
      WHEN 'peixe' THEN 'peixe'
      WHEN 'tilapia' THEN 'peixe'
      WHEN 'salmao' THEN 'peixe'
      WHEN 'camarao' THEN 'camarao'
      WHEN 'ovo' THEN 'ovo'
      WHEN 'ovos' THEN 'ovo'
      WHEN 'omelete' THEN 'ovo'
      ELSE NULL
    END;

    IF _protein_base IS NOT NULL THEN
      SELECT mva.library_item_id INTO _match
      FROM public.meal_visual_aliases mva
      JOIN public.meal_visual_library mvl ON mvl.id = mva.library_item_id AND mvl.is_active = true
      WHERE mva.normalized_alias = _protein_base
      LIMIT 1;

      IF _match IS NOT NULL THEN
        NEW.visual_library_item_id := _match;
        RETURN NEW;
      END IF;
      EXIT;
    END IF;
  END LOOP;

  -- NUNCA caímos em LIKE/partial. Se não achamos, ficamos sem imagem (placeholder no front).
  RETURN NEW;
END;
$$;

-- =========================================================
-- ETAPA 4: Validação de templates
-- =========================================================
CREATE OR REPLACE FUNCTION public.fn_validate_template_macros()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.kcal_base IS NULL OR NEW.kcal_base <= 0 THEN
    RAISE EXCEPTION 'Template inválido: kcal_base obrigatório (>0)';
  END IF;
  IF NEW.protein_base IS NULL OR NEW.protein_base <= 0 THEN
    RAISE EXCEPTION 'Template inválido: protein_base obrigatório (>0)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_template_macros ON public.nutritionist_meal_templates;
CREATE TRIGGER tr_validate_template_macros
BEFORE INSERT OR UPDATE ON public.nutritionist_meal_templates
FOR EACH ROW
EXECUTE FUNCTION public.fn_validate_template_macros();