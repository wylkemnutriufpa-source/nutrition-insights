
-- 1. Função de auto-reparo: para cada paciente que tem pelo menos 1 plano
--    publicado mas nenhum is_active, reativa o publicado MAIS RECENTE com itens.
CREATE OR REPLACE FUNCTION public.repair_orphaned_published_plans()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _repaired integer := 0;
  _rec record;
  _target_id uuid;
BEGIN
  FOR _rec IN
    SELECT mp.patient_id
    FROM public.meal_plans mp
    WHERE mp.plan_status IN ('published','published_to_patient','approved')
    GROUP BY mp.patient_id
    HAVING bool_or(mp.is_active) = false
  LOOP
    SELECT mp.id INTO _target_id
    FROM public.meal_plans mp
    WHERE mp.patient_id = _rec.patient_id
      AND mp.plan_status IN ('published','published_to_patient','approved')
      AND EXISTS (SELECT 1 FROM public.meal_plan_items i WHERE i.meal_plan_id = mp.id)
    ORDER BY mp.updated_at DESC
    LIMIT 1;

    IF _target_id IS NOT NULL THEN
      UPDATE public.meal_plans
      SET is_active = true, updated_at = now()
      WHERE id = _target_id;
      _repaired := _repaired + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'repaired_count', _repaired);
END;
$$;

-- 2. Executa o reparo agora para destravar todos os pacientes afetados.
SELECT public.repair_orphaned_published_plans();
