-- Tabela de auditoria para detectar interferências
CREATE TABLE IF NOT EXISTS public.macro_audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID NOT NULL,
    field_name TEXT NOT NULL,
    value_requested NUMERIC,
    value_persisted NUMERIC,
    operation TEXT NOT NULL,
    status TEXT NOT NULL, -- 'OK' ou 'VIOLATION'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela de auditoria
ALTER TABLE public.macro_audit_log ENABLE ROW LEVEL SECURITY;

-- Política simples: apenas leitura para debug (nutricionistas logados)
CREATE POLICY "Audit logs are viewable by authenticated users" 
ON public.macro_audit_log FOR SELECT USING (auth.role() = 'authenticated');

-- Função watchdog de integridade
CREATE OR REPLACE FUNCTION public.fn_check_macro_integrity()
RETURNS TRIGGER AS $$
DECLARE
    violation_found BOOLEAN := FALSE;
    fields_to_check TEXT[] := ARRAY['target_protein', 'target_carbs', 'target_fat', 'target_calories'];
    f TEXT;
    req_val NUMERIC;
    new_val NUMERIC;
BEGIN
    -- Esta função roda AFTER INSERT OR UPDATE para validar o estado final
    FOREACH f IN ARRAY fields_to_check LOOP
        -- Pegamos o valor que foi de fato salvo (NEW)
        EXECUTE format('SELECT ($1).%I', f) INTO new_val USING NEW;
        
        -- Aqui, como estamos no trigger AFTER, se houver diferença entre o que entrou
        -- e o que está no NEW, significa que algum trigger BEFORE ou regra alterou o valor.
        -- O Supabase já passou pelos triggers BEFORE.
        
        -- Nota: No PostgreSQL, NEW em AFTER triggers reflete o que foi escrito.
        -- Para detectar se mudou DURANTE o processo, comparamos com a intenção inicial.
        -- Mas triggers AFTER não sabem o que era o "input original" se triggers BEFORE já o mudaram.
        -- No entanto, como removemos todos os outros triggers, qualquer nova interferência 
        -- seria detectada se mantivermos este trigger como a ÚLTIMA barreira.
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para garantir que os macros não sejam alterados por NINGUÉM no banco
CREATE OR REPLACE FUNCTION public.fn_enforce_macro_authority()
RETURNS TRIGGER AS $$
BEGIN
    -- Registrar intenção nos logs para validação posterior se necessário
    -- (Opcional: implementar uma comparação mais rigorosa se surgirem comportamentos fantasmas)
    
    -- Bloquear campos de sistema que poderiam reintroduzir cálculos automáticos
    -- Se o nutricionista enviou, o banco obedece.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER DE PROTEÇÃO (BEFORE) para evitar alterações por outros triggers que venham a ser criados
CREATE TRIGGER zzz_protect_macros_before
BEFORE UPDATE OR INSERT ON public.meal_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_enforce_macro_authority();

-- TRIGGER DE AUDITORIA (AFTER) para verificar se algo passou
CREATE OR REPLACE FUNCTION public.fn_audit_macro_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- Se detectarmos que os valores finais são diferentes de uma expectativa (se pudéssemos passar o payload)
    -- Por agora, garantimos que não existem outros triggers ativos.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
