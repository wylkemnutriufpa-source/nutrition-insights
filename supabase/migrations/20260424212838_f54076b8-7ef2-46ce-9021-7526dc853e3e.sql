-- View de qualidade visual (ETAPA 2)
CREATE OR REPLACE VIEW public.v_visual_quality_metrics AS
SELECT
  COUNT(*) AS total_items,
  COUNT(*) FILTER (WHERE visual_library_item_id IS NOT NULL OR image_url IS NOT NULL) AS items_with_image,
  COUNT(*) FILTER (WHERE visual_library_item_id IS NULL AND image_url IS NULL) AS items_placeholder,
  ROUND(100.0 * COUNT(*) FILTER (WHERE visual_library_item_id IS NOT NULL OR image_url IS NOT NULL) / NULLIF(COUNT(*),0), 2) AS pct_coverage,
  (
    SELECT jsonb_agg(t)
    FROM (
      SELECT LOWER(TRIM(title)) AS title, COUNT(*) AS cnt
      FROM public.meal_plan_items
      WHERE visual_library_item_id IS NULL AND image_url IS NULL AND title IS NOT NULL
      GROUP BY 1 ORDER BY 2 DESC LIMIT 20
    ) t
  ) AS top_missing_titles
FROM public.meal_plan_items;

-- View security
REVOKE ALL ON public.v_visual_quality_metrics FROM PUBLIC, anon;
GRANT SELECT ON public.v_visual_quality_metrics TO authenticated;

-- Função de auditoria diária (ETAPA 6)
CREATE OR REPLACE FUNCTION public.fn_audit_missing_images()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _common_foods TEXT[] := ARRAY['feijao','feijão','arroz','frango','ovo','batata','banana','maca','maçã','aveia','leite','iogurte','peixe','carne','queijo','pao','pão'];
  _missing_common JSONB;
  _coverage NUMERIC;
BEGIN
  -- Alimentos comuns sem imagem (regra obrigatória — ETAPA 3)
  SELECT jsonb_agg(t)
  INTO _missing_common
  FROM (
    SELECT LOWER(TRIM(title)) AS title, COUNT(*) AS missing_count
    FROM public.meal_plan_items
    WHERE visual_library_item_id IS NULL
      AND image_url IS NULL
      AND title IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM unnest(_common_foods) cf
        WHERE LOWER(TRIM(meal_plan_items.title)) = cf
      )
    GROUP BY 1
    ORDER BY 2 DESC
  ) t;

  SELECT pct_coverage INTO _coverage FROM public.v_visual_quality_metrics;

  -- Registra auditoria
  INSERT INTO public.clinical_audit_logs (action_type, action_metadata)
  VALUES (
    'visual_quality_audit',
    jsonb_build_object(
      'coverage_pct', _coverage,
      'common_foods_missing', COALESCE(_missing_common, '[]'::jsonb),
      'audit_at', now()
    )
  );

  RETURN jsonb_build_object(
    'coverage_pct', _coverage,
    'common_foods_missing', COALESCE(_missing_common, '[]'::jsonb)
  );
END $$;

REVOKE ALL ON FUNCTION public.fn_audit_missing_images() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_audit_missing_images() TO authenticated;