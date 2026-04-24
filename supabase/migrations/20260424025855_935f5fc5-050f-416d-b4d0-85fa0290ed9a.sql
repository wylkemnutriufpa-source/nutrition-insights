-- 1. Adicionar nota clínica para restaurações
ALTER TABLE public.meal_plan_item_versions 
ADD COLUMN IF NOT EXISTS clinical_note TEXT;

-- 2. Função de captura otimizada (Sanitização e Auditoria)
CREATE OR REPLACE FUNCTION public.fn_capture_meal_plan_item_version(
    p_item_id UUID,
    p_action_type TEXT,
    p_restored_from UUID DEFAULT NULL,
    p_note TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_version_id UUID;
    v_patient_id UUID;
    v_snapshot JSONB;
BEGIN
    -- Localizar o patient_id
    SELECT mp.patient_id INTO v_patient_id
    FROM public.meal_plan_items i
    JOIN public.meal_plans mp ON i.meal_plan_id = mp.id
    WHERE i.id = p_item_id;

    -- Criar snapshot sanitizado (apenas o que importa para restauração clínica)
    SELECT jsonb_build_object(
        'title', i.title,
        'description', i.description,
        'protein_target', i.protein_target,
        'carbs_target', i.carbs_target,
        'fat_target', i.fat_target,
        'calories_target', i.calories_target,
        'meal_type', i.meal_type,
        'is_manually_edited', i.is_manually_edited
    ) INTO v_snapshot
    FROM public.meal_plan_items i
    WHERE id = p_item_id;

    -- Guardrail de tamanho (50kb)
    IF octet_length(v_snapshot::text) > 51200 THEN
        RAISE EXCEPTION 'Snapshot clínico excede o limite de tamanho permitido (50kb)';
    END IF;

    INSERT INTO public.meal_plan_item_versions (
        meal_plan_item_id,
        patient_id,
        snapshot_data,
        action_type,
        restored_from_version_id,
        clinical_note,
        created_by
    )
    VALUES (
        p_item_id,
        v_patient_id,
        v_snapshot,
        p_action_type,
        p_restored_from,
        p_note,
        auth.uid()
    )
    RETURNING id INTO v_version_id;
    
    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
