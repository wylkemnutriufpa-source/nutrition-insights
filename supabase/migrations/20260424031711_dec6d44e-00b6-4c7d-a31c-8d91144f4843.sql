-- 1. Fortalecer Restrições de Tabela (Usando nomes de colunas corretos do sistema: protein_target, etc)
-- Nota: A trigger agirá como o validador lógico principal.

-- 2. Trigger "Fonte da Verdade" no Backend com Validação Clínica Rígida
CREATE OR REPLACE FUNCTION public.fn_validate_and_version_meal_item()
RETURNS TRIGGER AS $$
DECLARE
    v_patient_id UUID;
    v_delta JSONB;
BEGIN
    -- Obter paciente do plano
    SELECT patient_id INTO v_patient_id FROM public.meal_plans WHERE id = NEW.meal_plan_id;
    
    -- Validação Rígida: Macros Negativos (Bloqueio Imediato)
    IF (NEW.protein_target < 0 OR NEW.carbs_target < 0 OR NEW.fat_target < 0) THEN
        INSERT INTO public.clinical_audit_logs (action_type, entity_id, status, error_message, created_by)
        VALUES ('VALIDATION_ERROR', NEW.id, 'error', 'Macros negativos detectados', auth.uid());
        RAISE EXCEPTION 'Erro Clínico: Macros não podem ser negativos.';
    END IF;

    -- Validação de Segurança de Proteína (+50% da meta original se houver meta)
    -- Se estivermos editando um item que já tem meta, validamos o novo valor contra o anterior ou contra o alvo
    IF (NEW.protein_target > 0 AND OLD.protein_target > 0 AND NEW.protein_target > (OLD.protein_target * 1.5)) THEN
         INSERT INTO public.clinical_audit_logs (action_type, entity_id, status, error_message, payload_summary)
         VALUES ('VALIDATION_ERROR', NEW.id, 'error', 'Excesso de proteína (+50%) detectado no update', jsonb_build_object('new', NEW.protein_target, 'old', OLD.protein_target));
         -- Apenas logamos ou bloqueamos dependendo da política. Aqui bloqueamos para hardening total.
         RAISE EXCEPTION 'Bloqueio Clínico: Aumento de proteína excede limite de segurança (+50%%).';
    END IF;

    -- Validação de Segurança de Calorias (±20% da meta)
    IF (NEW.calories_target > 0 AND OLD.calories_target > 0 AND (ABS(NEW.calories_target - OLD.calories_target) / OLD.calories_target) > 0.2) THEN
        INSERT INTO public.clinical_audit_logs (action_type, entity_id, status, error_message, payload_summary)
        VALUES ('VALIDATION_ERROR', NEW.id, 'error', 'Variação calórica excessiva (>20%)', jsonb_build_object('new', NEW.calories_target, 'old', OLD.calories_target));
        RAISE EXCEPTION 'Bloqueio Clínico: Variação calórica excede limite de segurança (20%%).';
    END IF;

    -- Calcular Delta para Auditoria se for update
    IF (TG_OP = 'UPDATE') THEN
        v_delta := jsonb_build_object(
            'p', COALESCE(NEW.protein_target, 0) - COALESCE(OLD.protein_target, 0),
            'c', COALESCE(NEW.carbs_target, 0) - COALESCE(OLD.carbs_target, 0),
            'f', COALESCE(NEW.fat_target, 0) - COALESCE(OLD.fat_target, 0),
            'kcal', COALESCE(NEW.calories_target, 0) - COALESCE(OLD.calories_target, 0)
        );
    END IF;

    -- Versionamento Imutável Automático integrado à trigger
    -- Isso garante que TODO update ou insert gere uma versão, sem depender do front
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
            'description', NEW.description,
            'title', NEW.title,
            'metadata', NEW.metadata
        )
    );

    -- Log de Auditoria Unificado
    INSERT INTO public.clinical_audit_logs (
        action_type, 
        entity_id, 
        patient_id, 
        status, 
        delta_macros,
        payload_summary,
        created_by
    ) VALUES (
        CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' ELSE 'EDIT' END, 
        NEW.id, 
        v_patient_id, 
        'success', 
        v_delta,
        jsonb_build_object('trigger', 'hardening_final'),
        auth.uid()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar Trigger
DROP TRIGGER IF EXISTS tr_validate_meal_item ON public.meal_plan_items;
CREATE TRIGGER tr_validate_meal_item
BEFORE INSERT OR UPDATE ON public.meal_plan_items
FOR EACH ROW EXECUTE FUNCTION public.fn_validate_and_version_meal_item();
