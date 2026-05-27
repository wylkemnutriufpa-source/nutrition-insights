-- 1. RLS e Segurança
ALTER TABLE public.patient_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projection_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events" ON public.patient_events
    FOR SELECT TO authenticated USING (auth.uid() = patient_id OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'nutritionist', 'personal')
    ));

CREATE POLICY "Service role full access to events" ON public.patient_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Profiles can view projection versions" ON public.projection_versions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role full access to projection versions" ON public.projection_versions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. RECONSTRUÇÃO TOTAL: Função para reconstruir projeções do zero
CREATE OR REPLACE FUNCTION public.rebuild_patient_projection(_patient_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    r RECORD;
BEGIN
    -- Bloqueio para evitar race conditions durante reconstrução
    PERFORM 1 FROM public.profiles WHERE user_id = _patient_id FOR UPDATE;

    -- Itera sobre todos os eventos na ordem correta
    FOR r IN (
        SELECT event_type, payload, sequence 
        FROM public.patient_events 
        WHERE patient_id = _patient_id 
        ORDER BY sequence ASC
    ) LOOP
        -- Lógica de Projeção (Redutora)
        IF r.event_type = 'PATIENT_CREATED' THEN
            -- Re-insert ou Update no perfil
            INSERT INTO public.profiles (user_id, full_name, email, tenant_id)
            VALUES (
                _patient_id, 
                r.payload->>'full_name', 
                r.payload->>'email', 
                (r.payload->>'tenant_id')::uuid
            )
            ON CONFLICT (user_id) DO UPDATE
            SET full_name = EXCLUDED.full_name,
                email = EXCLUDED.email;
        
        ELSIF r.event_type = 'ONBOARDING_RELEASED' THEN
            -- Lógica para liberar onboarding na projeção
            UPDATE public.onboarding_pipelines
            SET release_status = 'released', updated_at = now()
            WHERE patient_id = _patient_id;
        END IF;

        -- Atualiza a versão da projeção
        UPDATE public.projection_versions
        SET last_sequence = r.sequence, updated_at = now()
        WHERE patient_id = _patient_id;
    END LOOP;
END;
$$;

-- 3. Atualizar append_patient_event para incluir Projeção Atômica (Snapshot)
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
    v_tenant_id UUID;
BEGIN
    -- Idempotência
    SELECT sequence, event_id INTO v_sequence, v_event_id
    FROM public.patient_events
    WHERE request_id = _request_id;

    IF FOUND THEN
        RETURN jsonb_build_object('status', 'idempotent', 'sequence', v_sequence, 'event_id', v_event_id);
    END IF;

    -- Append
    INSERT INTO public.patient_events (patient_id, request_id, event_type, payload, metadata)
    VALUES (_patient_id, _request_id, _event_type, _payload, _metadata)
    RETURNING sequence, event_id INTO v_sequence, v_event_id;

    -- SNAPSHOT ATÔMICO (Projeção Síncrona)
    -- Esta é a única parte mutável "viva", mas ela é derivada do evento acima
    IF _event_type = 'PATIENT_CREATED' THEN
        -- Garantir tenant
        v_tenant_id := (_payload->>'tenant_id')::uuid;
        IF v_tenant_id IS NULL THEN
            SELECT id INTO v_tenant_id FROM public.tenants WHERE is_active = true LIMIT 1;
        END IF;

        INSERT INTO public.profiles (user_id, full_name, email, tenant_id)
        VALUES (_patient_id, _payload->>'full_name', _payload->>'email', v_tenant_id)
        ON CONFLICT (user_id) DO UPDATE
        SET full_name = EXCLUDED.full_name;

        INSERT INTO public.patients (user_id, nutritionist_id)
        VALUES (_patient_id, (_payload->>'nutritionist_id')::uuid)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    -- Atualiza Versão
    INSERT INTO public.projection_versions (patient_id, last_sequence)
    VALUES (_patient_id, v_sequence)
    ON CONFLICT (patient_id) DO UPDATE SET last_sequence = v_sequence, updated_at = now();

    RETURN jsonb_build_object('status', 'appended', 'sequence', v_sequence, 'event_id', v_event_id);
END;
$$;
