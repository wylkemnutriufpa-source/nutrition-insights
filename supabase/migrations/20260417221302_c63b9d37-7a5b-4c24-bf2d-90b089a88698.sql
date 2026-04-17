-- Andrea Ferreira da Silva (42afc613-e9ce-4408-9b3e-9da8c9f3e9ca)
-- Estava travada no onboarding por falta de clinical_consents

INSERT INTO public.clinical_consents (patient_id, accepted_terms_version, accepted_at)
SELECT '42afc613-e9ce-4408-9b3e-9da8c9f3e9ca'::uuid, 'v1.0', now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.clinical_consents
  WHERE patient_id = '42afc613-e9ce-4408-9b3e-9da8c9f3e9ca'
    AND revoked_at IS NULL
);

-- Garantir pipeline liberado e em estado de anamnese
UPDATE public.onboarding_pipelines
SET release_status = 'released',
    status = 'pending_anamnesis',
    updated_at = now()
WHERE patient_id = '42afc613-e9ce-4408-9b3e-9da8c9f3e9ca';

-- Garantir vínculo ativo
UPDATE public.nutritionist_patients
SET status = 'active',
    journey_status = 'onboarding_active'
WHERE patient_id = '42afc613-e9ce-4408-9b3e-9da8c9f3e9ca';