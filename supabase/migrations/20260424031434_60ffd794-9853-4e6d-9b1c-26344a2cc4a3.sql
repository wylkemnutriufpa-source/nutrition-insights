-- Tabela de Auditoria Clínica Global
CREATE TABLE IF NOT EXISTS public.clinical_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL, -- 'VERSION', 'RESTORE', 'VALIDATION', 'ERROR', 'GENERATE'
    entity_id UUID,
    patient_id UUID,
    created_by UUID NOT NULL DEFAULT auth.uid(),
    status TEXT NOT NULL CHECK (status IN ('success', 'error')),
    payload_summary JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS na auditoria
ALTER TABLE public.clinical_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso à auditoria por autoria"
ON public.clinical_audit_logs
FOR SELECT
USING (
    created_by = auth.uid()
);

-- Índices para performance de busca e filtros
CREATE INDEX IF NOT EXISTS idx_audit_created_by_action ON public.clinical_audit_logs (created_by, action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_patient ON public.clinical_audit_logs (patient_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_versions_composite ON public.meal_plan_item_versions (meal_plan_item_id, created_at DESC);

-- Refinamento da Trigger de Captura para incluir Validação Clínica e Auditoria
CREATE OR REPLACE FUNCTION public.fn_capture_meal_plan_item_version()
RETURNS TRIGGER AS $$
DECLARE
    v_patient_id UUID;
BEGIN
    -- Validação Clínica Rígida antes de versionar (Prevenção de Inconsistência)
    IF (NEW.protein < 0 OR NEW.carbs < 0 OR NEW.fat < 0) THEN
        INSERT INTO public.clinical_audit_logs (action_type, entity_id, status, error_message, payload_summary)
        VALUES ('VALIDATION', NEW.id, 'error', 'Macros negativos detectados', jsonb_build_object('protein', NEW.protein, 'carbs', NEW.carbs, 'fat', NEW.fat));
        RAISE EXCEPTION 'Erro Clínico: Macros não podem ser negativos.';
    END IF;

    -- Tentar obter patient_id do meal_plan relacionado
    SELECT patient_id INTO v_patient_id FROM public.meal_plans WHERE id = NEW.meal_plan_id LIMIT 1;

    -- Captura da Versão na tabela existente
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
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'create'
            ELSE 'edit'
        END,
        jsonb_build_object(
            'protein', NEW.protein,
            'carbs', NEW.carbs,
            'fat', NEW.fat,
            'calories', NEW.calories,
            'quantity', NEW.quantity,
            'food_id', NEW.food_id
        )
    );

    -- Log de Auditoria de Sucesso
    INSERT INTO public.clinical_audit_logs (action_type, entity_id, patient_id, status, payload_summary)
    VALUES ('VERSION', NEW.id, v_patient_id, 'success', jsonb_build_object('op', TG_OP));

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log de Erro na Auditoria
    INSERT INTO public.clinical_audit_logs (action_type, entity_id, status, error_message)
    VALUES ('ERROR', NEW.id, 'error', SQLERRM);
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
