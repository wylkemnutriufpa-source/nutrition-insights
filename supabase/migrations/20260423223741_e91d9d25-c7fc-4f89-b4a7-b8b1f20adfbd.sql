-- 1. Limpeza
DROP FUNCTION IF EXISTS public.migrate_all_plans_to_new_model();

-- 2. Auditoria
CREATE TABLE IF NOT EXISTS public.clinical_plan_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES auth.users(id),
    plan_id UUID REFERENCES public.meal_plans(id) ON DELETE CASCADE,
    validation_status TEXT NOT NULL,
    issues JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Políticas
ALTER TABLE public.clinical_plan_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profissionais podem ver logs de auditoria" ON public.clinical_plan_audit_logs;
CREATE POLICY "Profissionais podem ver logs de auditoria" ON public.clinical_plan_audit_logs FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));

-- 4. Validação
CREATE OR REPLACE FUNCTION public.validate_plan_integrity(p_plan_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_plan_type TEXT;
    v_issues JSONB := '[]'::jsonb;
    v_item_count INT;
    v_missing_images INT;
    v_invalid_marmitas INT;
BEGIN
    SELECT plan_type INTO v_plan_type FROM public.meal_plans WHERE id = p_plan_id;
    SELECT count(*) INTO v_item_count FROM public.meal_plan_items WHERE meal_plan_id = p_plan_id;
    IF v_item_count = 0 THEN v_issues := v_issues || jsonb_build_object('level', 'error', 'message', 'Plano vazio.'); END IF;
    SELECT count(*) INTO v_missing_images FROM public.meal_plan_items WHERE meal_plan_id = p_plan_id AND (image_url IS NULL OR image_url = '' OR image_url ILIKE '%placeholder%');
    IF v_missing_images > 0 THEN v_issues := v_issues || jsonb_build_object('level', 'error', 'message', format('%s refeições sem foto real.', v_missing_images)); END IF;
    IF v_plan_type = 'marmita' THEN
        SELECT count(*) INTO v_invalid_marmitas FROM public.meal_plan_items WHERE meal_plan_id = p_plan_id AND protein_type IS NULL;
        IF v_invalid_marmitas > 0 THEN v_issues := v_issues || jsonb_build_object('level', 'error', 'message', 'Proteína não definida em marmita.'); END IF;
    END IF;
    RETURN v_issues;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger
CREATE OR REPLACE FUNCTION public.trigger_audit_meal_plan()
RETURNS TRIGGER AS $$
DECLARE
    v_issues JSONB;
    v_status TEXT;
BEGIN
    v_issues := public.validate_plan_integrity(NEW.id);
    v_status := CASE WHEN jsonb_array_length(v_issues) > 0 THEN 'invalid' ELSE 'valid' END;
    INSERT INTO public.clinical_plan_audit_logs (patient_id, plan_id, validation_status, issues) VALUES (NEW.patient_id, NEW.id, v_status, v_issues);
    IF (NEW.plan_status = 'published_to_patient' OR NEW.plan_status = 'approved') AND v_status = 'invalid' THEN
        RAISE EXCEPTION 'BLOQUEIO CLÍNICO: Plano inválido para publicação. Verifique as fotos e macros: %', v_issues;
    END IF;
    RETURN NEW;   
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_meal_plan_changes ON public.meal_plans;
CREATE TRIGGER audit_meal_plan_changes AFTER INSERT OR UPDATE ON public.meal_plans FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_meal_plan();

-- 6. Migração
CREATE OR REPLACE FUNCTION public.migrate_all_plans_to_new_model()
RETURNS TABLE (count_plans INT, count_items_removed INT) AS $$
DECLARE
    v_plans_updated INT;
    v_items_deleted INT;
BEGIN
    UPDATE public.meal_plans SET plan_type = 'normal' WHERE plan_type IS NULL;
    GET DIAGNOSTICS v_plans_updated = ROW_COUNT;
    SET session_replication_role = 'replica';
    DELETE FROM public.meal_plan_items WHERE day_of_week > 1;
    GET DIAGNOSTICS v_items_deleted = ROW_COUNT;
    SET session_replication_role = 'origin';
    RETURN QUERY SELECT v_plans_updated, v_items_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT * FROM public.migrate_all_plans_to_new_model();
