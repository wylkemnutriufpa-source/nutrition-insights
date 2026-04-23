-- Ajustar função de auditoria para remover erro de coluna inexistente
CREATE OR REPLACE FUNCTION public.validate_plan_integrity(p_plan_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_item_count INTEGER;
    v_missing_images INTEGER;
    v_issues JSONB := '[]'::jsonb;
    v_plan_type TEXT;
BEGIN
    SELECT plan_type INTO v_plan_type FROM public.meal_plans WHERE id = p_plan_id;
    
    SELECT COUNT(*) INTO v_item_count FROM public.meal_plan_items WHERE meal_plan_id = p_plan_id;
    
    -- Se for marmita, validar se todas as refeições têm imagem
    SELECT COUNT(*) INTO v_missing_images 
    FROM public.meal_plan_items 
    WHERE meal_plan_id = p_plan_id AND image_url IS NULL;

    IF v_item_count < 1 THEN
        v_issues := v_issues || jsonb_build_array('Plano vazio: nenhuma refeição cadastrada');
    END IF;

    IF v_plan_type = 'marmita' AND v_missing_images > 0 THEN
        v_issues := v_issues || jsonb_build_array('Marmita: ' || v_missing_images || ' itens sem imagem associada');
    END IF;

    RETURN jsonb_build_object(
        'is_valid', jsonb_array_length(v_issues) = 0,
        'issues', v_issues,
        'item_count', v_item_count
    );
END;
$$ LANGUAGE plpgsql;
