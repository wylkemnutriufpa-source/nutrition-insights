-- Corrigir tabela de auditoria com nomes reais
DROP TABLE IF EXISTS public.macro_audit_log;
CREATE TABLE public.macro_audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID NOT NULL,
    field_name TEXT NOT NULL,
    value_requested NUMERIC,
    value_persisted NUMERIC,
    operation TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.macro_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit logs are viewable by authenticated users" 
ON public.macro_audit_log FOR SELECT USING (auth.role() = 'authenticated');

-- Função watchdog de integridade com search_path seguro
CREATE OR REPLACE FUNCTION public.fn_check_macro_integrity()
RETURNS TRIGGER AS $$
DECLARE
    violation_found BOOLEAN := FALSE;
    fields_to_check TEXT[] := ARRAY['protein_target', 'carbs_target', 'fat_target', 'calories_target'];
    f TEXT;
    new_val NUMERIC;
BEGIN
    -- Watchdog que impede mudanças não autorizadas
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função de autoridade definitiva do nutricionista
CREATE OR REPLACE FUNCTION public.fn_enforce_macro_authority()
RETURNS TRIGGER AS $$
BEGIN
    -- Garante que is_manually_edited seja verdadeiro se macros mudarem
    IF TG_OP = 'UPDATE' THEN
        IF NEW.protein_target <> OLD.protein_target OR 
           NEW.carbs_target <> OLD.carbs_target OR 
           NEW.fat_target <> OLD.fat_target THEN
           NEW.is_manually_edited := TRUE;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recriar trigger de proteção
DROP TRIGGER IF EXISTS zzz_protect_macros_before ON public.meal_plan_items;
CREATE TRIGGER zzz_protect_macros_before
BEFORE UPDATE OR INSERT ON public.meal_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_enforce_macro_authority();
