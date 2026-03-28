
-- Lote 3: SET NOT NULL em clinical_alerts, automation_rules, automation_runs, behavioral_recovery_actions
ALTER TABLE public.clinical_alerts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.automation_rules ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.automation_runs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.behavioral_recovery_actions ALTER COLUMN tenant_id SET NOT NULL;
