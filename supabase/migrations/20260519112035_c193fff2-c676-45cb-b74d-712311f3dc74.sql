-- 1. Forçar estado de Silvia Luz para 'active_plan' para garantir acesso total
UPDATE public.profiles 
SET patient_state = 'active_plan' 
WHERE full_name ILIKE '%Silvia Luz%' OR user_id = '6699274a-af91-48e6-8163-36ca484b3c2b';

-- 2. Atualizar vínculo de Silvia Luz para 'onboarding_active' (estado fluido liberado pelo RPC)
UPDATE public.nutritionist_patients 
SET journey_status = 'onboarding_active', status = 'active'
WHERE patient_id = '6699274a-af91-48e6-8163-36ca484b3c2b';

-- 3. Garantir que o pipeline de onboarding não esteja travado
UPDATE public.onboarding_pipelines
SET release_status = 'released', status = 'pending_approval'
WHERE patient_id = '6699274a-af91-48e6-8163-36ca484b3c2b';

-- 4. Criar rascunho V3 inicial para Silvia Luz se não existir, evitando tela vazia
INSERT INTO public.v3_drafts (patient_id, nutritionist_id, tenant_id, payload, meta_kcal, meta_protein, meta_carbs, meta_fat, editor_version, draft_status)
SELECT 
    '6699274a-af91-48e6-8163-36ca484b3c2b', 
    '67f47696-a778-4ada-9ff9-9615fb7a7c48', 
    '20081963-8db9-4a6c-8181-6a820b86e12f',
    '{"meals": [], "version": 1, "audit_log": []}'::jsonb,
    0, 0, 0, 0,
    'v3',
    'editing'
WHERE NOT EXISTS (
    SELECT 1 FROM public.v3_drafts 
    WHERE patient_id = '6699274a-af91-48e6-8163-36ca484b3c2b' 
    AND draft_status = 'editing'
);