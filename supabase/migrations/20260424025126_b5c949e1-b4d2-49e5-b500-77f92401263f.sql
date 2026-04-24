-- Tabela de versões para histórico clínico permanente
CREATE TABLE IF NOT EXISTS public.meal_plan_item_versions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    meal_plan_item_id UUID NOT NULL REFERENCES public.meal_plan_items(id) ON DELETE CASCADE,
    snapshot_data JSONB NOT NULL,
    action_type TEXT NOT NULL, -- 'manual_update', 'auto_correction', 'rollback'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.meal_plan_item_versions ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (baseadas no tenant_id do item original)
CREATE POLICY "Users can view versions of items they have access to" 
ON public.meal_plan_item_versions FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.meal_plan_items i 
        WHERE i.id = meal_plan_item_versions.meal_plan_item_id
    )
);

-- Função para capturar snapshot
CREATE OR REPLACE FUNCTION public.fn_capture_meal_plan_item_version(
    p_item_id UUID,
    p_action_type TEXT
)
RETURNS UUID AS $$
DECLARE
    v_version_id UUID;
BEGIN
    INSERT INTO public.meal_plan_item_versions (
        meal_plan_item_id,
        snapshot_data,
        action_type,
        created_by
    )
    SELECT 
        id,
        to_jsonb(i.*),
        p_action_type,
        auth.uid()
    FROM public.meal_plan_items i
    WHERE id = p_item_id
    RETURNING id INTO v_version_id;
    
    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
