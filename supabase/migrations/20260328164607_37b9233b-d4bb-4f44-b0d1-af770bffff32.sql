
-- Lote 4: SET NOT NULL em campaigns, branding_settings, audit_logs
ALTER TABLE public.campaigns ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.branding_settings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.audit_logs ALTER COLUMN tenant_id SET NOT NULL;
