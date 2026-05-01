-- Remover funções antigas se houver conflito de assinatura
DROP FUNCTION IF EXISTS public.check_rate_limit(text, text, integer, integer);
DROP FUNCTION IF EXISTS public.log_security_event(text, text, text, jsonb);

-- Tabela de Logs de Segurança Avançados
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, 
    severity TEXT NOT NULL, 
    message TEXT NOT NULL,
    source_ip TEXT,
    user_id UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver logs de segurança
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all security logs') THEN
        CREATE POLICY "Admins can view all security logs"
        ON public.security_logs
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM public.user_roles 
                WHERE user_id = auth.uid() 
                AND role = 'admin'
            )
        );
    END IF;
END $$;

-- Tabela para Rate Limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL, 
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT now(),
    UNIQUE(key, endpoint)
);

-- Habilitar RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Função interna para check de rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_key TEXT,
    p_endpoint TEXT,
    p_max_requests INTEGER,
    p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Limpeza de registros expirados da chave específica
    DELETE FROM public.rate_limits 
    WHERE key = p_key 
    AND endpoint = p_endpoint 
    AND window_start < (now() - (p_window_seconds || ' seconds')::interval);

    INSERT INTO public.rate_limits (key, endpoint, request_count, window_start)
    VALUES (p_key, p_endpoint, 1, now())
    ON CONFLICT (key, endpoint) DO UPDATE
    SET request_count = public.rate_limits.request_count + 1
    RETURNING request_count INTO v_count;

    RETURN v_count <= p_max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para registrar eventos de segurança via RPC
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_event_type TEXT,
    p_severity TEXT,
    p_message TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.security_logs (event_type, severity, message, user_id, metadata)
    VALUES (p_event_type, p_severity, p_message, auth.uid(), p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
