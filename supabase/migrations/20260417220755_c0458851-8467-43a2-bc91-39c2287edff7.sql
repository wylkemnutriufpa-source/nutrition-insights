-- 1) Reativar Mayara
UPDATE public.nutritionist_patients
SET status = 'active',
    journey_status = COALESCE(NULLIF(journey_status,''), 'onboarding_active')
WHERE patient_id = '9930c2ab-0d82-455f-92cc-74ca28de8c02'
  AND nutritionist_id = '67f47696-a778-4ada-9ff9-9615fb7a7c48';

-- 2) Garantir user_tenants (cast correto: tenant_role)
INSERT INTO public.user_tenants (user_id, tenant_id, role)
SELECT user_id, tenant_id, 'patient'::tenant_role
FROM public.profiles
WHERE user_id IN (
  'd83fe021-8519-49e3-a651-c9192e7a25d0',
  '9930c2ab-0d82-455f-92cc-74ca28de8c02',
  '187282cb-bde8-4a04-bbed-f984892c3c1e'
)
ON CONFLICT DO NOTHING;

-- 3) Pipelines liberados
UPDATE public.onboarding_pipelines
SET release_status = 'released',
    updated_at = now()
WHERE patient_id IN (
  'd83fe021-8519-49e3-a651-c9192e7a25d0',
  '9930c2ab-0d82-455f-92cc-74ca28de8c02',
  '187282cb-bde8-4a04-bbed-f984892c3c1e'
)
AND release_status <> 'released';

-- 4) FIX CRÍTICO RLS: remover get_user_tenant() do SELECT da anamnese
-- Causa race condition em INSERT...RETURNING quando tenant ainda não resolveu.
-- A cláusula é redundante: user_id = auth.uid() já isola por usuário.
DROP POLICY IF EXISTS "Patients can view own anamnesis" ON public.patient_anamnesis;

CREATE POLICY "Patients can view own anamnesis"
ON public.patient_anamnesis
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
