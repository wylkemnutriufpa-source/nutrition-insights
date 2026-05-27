-- 1. EVENT STORE: A única fonte da verdade
CREATE TABLE IF NOT EXISTS public.patient_events (
    sequence BIGSERIAL PRIMARY KEY,
    event_id UUID DEFAULT gen_random_uuid() NOT NULL,
    patient_id UUID NOT NULL,
    request_id UUID NOT NULL UNIQUE, -- Idempotência Real
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexação para performance de replay e busca por paciente
CREATE INDEX idx_patient_events_patient_id ON public.patient_events(patient_id);
CREATE INDEX idx_patient_events_event_type ON public.patient_events(event_type);

-- 2. SNAPSHOT CONTROL: Controle de versão das projeções (Consistency Guard)
CREATE TABLE IF NOT EXISTS public.projection_versions (
    patient_id UUID PRIMARY KEY,
    last_sequence BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. SINGLE APPENDER: Função canônica de escrita
CREATE OR REPLACE FUNCTION public.append_patient_event(
    _patient_id UUID,
    _request_id UUID,
    _event_type TEXT,
    _payload JSONB,
    _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_sequence BIGINT;
    v_event_id UUID;
BEGIN
    -- Idempotência: Se o request_id já existe, retorna o evento existente
    SELECT sequence, event_id INTO v_sequence, v_event_id
    FROM public.patient_events
    WHERE request_id = _request_id;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'status', 'idempotent',
            'sequence', v_sequence,
            'event_id', v_event_id
        );
    END IF;

    -- Append do evento
    INSERT INTO public.patient_events (patient_id, request_id, event_type, payload, metadata)
    VALUES (_patient_id, _request_id, _event_type, _payload, _metadata)
    RETURNING sequence, event_id INTO v_sequence, v_event_id;

    -- Snapshot Atômico: Atualização imediata do controle de versão (opcional, pode ser via trigger)
    -- Para garantir consistência forte, fazemos o update na mesma transação
    INSERT INTO public.projection_versions (patient_id, last_sequence, updated_at)
    VALUES (_patient_id, v_sequence, now())
    ON CONFLICT (patient_id) DO UPDATE
    SET last_sequence = v_sequence, updated_at = now();

    -- Notify para Projection Workers assíncronos
    PERFORM pg_notify('patient_event_stream', jsonb_build_object(
        'sequence', v_sequence,
        'patient_id', _patient_id,
        'event_type', _event_type
    )::text);

    RETURN jsonb_build_object(
        'status', 'appended',
        'sequence', v_sequence,
        'event_id', v_event_id
    );
END;
$$;

-- 4. PERMISSÕES: Blindagem de Banco (Hard Lock)
-- Apenas o service_role e o próprio sistema (via functions) podem gravar eventos
GRANT SELECT ON public.patient_events TO authenticated;
GRANT ALL ON public.patient_events TO service_role;
GRANT EXECUTE ON FUNCTION public.append_patient_event TO service_role;
GRANT EXECUTE ON FUNCTION public.append_patient_event TO authenticated; -- Para permitir via app controlada

-- Revogar escrita direta em tabelas de estado (Exemplo: profiles)
-- NOTA: Em produção, isso deve ser feito após a migração completa dos fluxos para o ZMS.
-- REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM authenticated, anon;
-- REVOKE INSERT, UPDATE, DELETE ON public.onboarding_pipelines FROM authenticated, anon;

-- Criar VIEW para auditoria forense simplificada
CREATE OR REPLACE VIEW public.vw_patient_history AS
SELECT 
    sequence,
    patient_id,
    event_type,
    created_at,
    payload,
    request_id
FROM public.patient_events
ORDER BY sequence DESC;

GRANT SELECT ON public.vw_patient_history TO authenticated;
