
-- Lote 1: SET NOT NULL em profiles, nutritionist_patients, patient_anamnesis
ALTER TABLE public.profiles ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.nutritionist_patients ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.patient_anamnesis ALTER COLUMN tenant_id SET NOT NULL;
