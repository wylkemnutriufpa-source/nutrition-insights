-- 1. Criar o tipo ENUM para o estado do paciente
DO $$ BEGIN
    CREATE TYPE patient_state_type AS ENUM (
        'onboarding_slides',
        'anamnesis',
        'collecting_profile',
        'ready_for_plan',
        'plan_generated',
        'active_plan'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Adicionar a coluna de estado global na tabela de perfis
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS patient_state patient_state_type DEFAULT 'onboarding_slides';

-- 3. Função de resolução de estado (Single Source of Truth) no Banco
CREATE OR REPLACE FUNCTION public.get_calculated_patient_state(p_user_id UUID)
RETURNS patient_state_type AS $$
DECLARE
    v_has_anamnesis BOOLEAN;
    v_has_plan BOOLEAN;
    v_onboarding_completed BOOLEAN;
BEGIN
    -- Checar dados existentes usando colunas e tabelas reais
    SELECT COALESCE(fit_intelligence_onboarded, false) INTO v_onboarding_completed FROM profiles WHERE id = p_user_id;
    
    -- Verificar anamnese
    SELECT COALESCE(is_anamnesis_completed, false) INTO v_has_anamnesis FROM profiles WHERE id = p_user_id;
    IF NOT v_has_anamnesis THEN
        SELECT EXISTS(SELECT 1 FROM patient_anamnesis WHERE user_id = p_user_id) INTO v_has_anamnesis;
    END IF;
    
    -- Verificar plano ativo
    SELECT EXISTS(SELECT 1 FROM meal_plans WHERE patient_id = p_user_id AND is_active = true) INTO v_has_plan;

    -- Lógica determinística de estado
    IF v_has_plan THEN
        RETURN 'active_plan';
    ELSIF v_has_anamnesis THEN
        RETURN 'ready_for_plan';
    ELSIF v_onboarding_completed THEN
        RETURN 'anamnesis';
    ELSE
        RETURN 'onboarding_slides';
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Função de migração segura (sem disparar trigger de auditoria para evitar erros de tenant)
CREATE OR REPLACE FUNCTION public.migrate_to_single_source_of_truth()
RETURNS void AS $$
BEGIN
    -- Desabilitar triggers temporariamente para a migração em massa
    ALTER TABLE public.profiles DISABLE TRIGGER tr_patient_state_audit;
    
    UPDATE public.profiles
    SET patient_state = get_calculated_patient_state(id);
    
    ALTER TABLE public.profiles ENABLE TRIGGER tr_patient_state_audit;
EXCEPTION WHEN OTHERS THEN
    -- Garantir que o trigger seja reabilitado se algo falhar
    ALTER TABLE public.profiles ENABLE TRIGGER tr_patient_state_audit;
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para Auditoria de Mudança de Estado
CREATE OR REPLACE FUNCTION public.on_patient_state_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.patient_state IS DISTINCT FROM NEW.patient_state THEN
        -- Tentar inserir log apenas se houver tenant_id para evitar falhas em usuários órfãos
        IF NEW.tenant_id IS NOT NULL THEN
            BEGIN
                INSERT INTO public.audit_logs (
                    user_id,
                    action,
                    resource_type,
                    resource_id,
                    tenant_id,
                    metadata
                ) VALUES (
                    NEW.id,
                    'PATIENT_STATE_UPDATE',
                    'profile',
                    NEW.id::text,
                    NEW.tenant_id,
                    jsonb_build_object(
                        'old_state', COALESCE(OLD.patient_state::text, 'NULL'),
                        'new_state', NEW.patient_state::text,
                        'reason', 'Automatic transition or manual update'
                    )
                );
            EXCEPTION WHEN OTHERS THEN
                -- Se falhar logar (ex: trigger de tenant_id), não trava a aplicação
                NULL;
            END;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS tr_patient_state_audit ON public.profiles;
CREATE TRIGGER tr_patient_state_audit
    AFTER UPDATE OF patient_state ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.on_patient_state_change();

-- 6. Executar migração inicial
SELECT migrate_to_single_source_of_truth();
