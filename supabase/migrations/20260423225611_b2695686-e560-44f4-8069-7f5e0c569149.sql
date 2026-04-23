-- Corrigir a função de integridade para ser robusta
CREATE OR REPLACE FUNCTION public.validate_plan_integrity(p_plan_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_item_count INTEGER;
    v_missing_images INTEGER;
    v_plan_type TEXT;
    v_result JSONB;
BEGIN
    SELECT plan_type INTO v_plan_type FROM public.meal_plans WHERE id = p_plan_id;
    SELECT COUNT(*) INTO v_item_count FROM public.meal_plan_items WHERE meal_plan_id = p_plan_id;
    
    SELECT COUNT(*) INTO v_missing_images 
    FROM public.meal_plan_items 
    WHERE meal_plan_id = p_plan_id AND image_url IS NULL;

    -- Retornar sempre um objeto estruturado
    v_result := jsonb_build_object(
        'is_valid', (v_item_count >= 5),
        'item_count', v_item_count,
        'missing_images', v_missing_images,
        'issues', CASE 
            WHEN v_item_count < 5 THEN jsonb_build_array('Plano incompleto: menos de 5 refeições')
            ELSE '[]'::jsonb
        END
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Corrigir o gatilho que estava falhando ao tentar ler array de não-array
CREATE OR REPLACE FUNCTION public.trigger_audit_meal_plan()
RETURNS TRIGGER AS $$
DECLARE
    v_validation JSONB;
BEGIN
    v_validation := public.validate_plan_integrity(NEW.id);
    
    NEW.overall_validation_status := CASE 
        WHEN (v_validation->>'is_valid')::boolean THEN 'aprovado'
        ELSE 'pendente'
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
