-- 1. Evoluir a tabela de versionamento para suporte clínico total
ALTER TABLE public.meal_plan_item_versions 
ADD COLUMN IF NOT EXISTS patient_id UUID,
ADD COLUMN IF NOT EXISTS restored_from_version_id UUID REFERENCES public.meal_plan_item_versions(id);

-- 2. Criar índices para performance de busca histórica
CREATE INDEX IF NOT EXISTS idx_versions_item_id_created_at 
ON public.meal_plan_item_versions (meal_plan_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_versions_patient_id 
ON public.meal_plan_item_versions (patient_id);

-- 3. Função de captura avançada com autoria e rastreabilidade de paciente
CREATE OR REPLACE FUNCTION public.fn_capture_meal_plan_item_version(
    p_item_id UUID,
    p_action_type TEXT,
    p_restored_from UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_version_id UUID;
    v_patient_id UUID;
BEGIN
    -- Localizar o patient_id através da hierarquia: item -> plano -> perfil/user
    SELECT mp.patient_id INTO v_patient_id
    FROM public.meal_plan_items i
    JOIN public.meal_plans mp ON i.meal_plan_id = mp.id
    WHERE i.id = p_item_id;

    INSERT INTO public.meal_plan_item_versions (
        meal_plan_item_id,
        patient_id,
        snapshot_data,
        action_type,
        restored_from_version_id,
        created_by
    )
    SELECT 
        id,
        v_patient_id,
        to_jsonb(i.*),
        p_action_type,
        p_restored_from,
        auth.uid()
    FROM public.meal_plan_items i
    WHERE id = p_item_id
    RETURNING id INTO v_version_id;
    
    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
