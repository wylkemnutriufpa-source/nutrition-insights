
CREATE TABLE public.meal_plan_simplification_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  meal_plan_item_id UUID REFERENCES public.meal_plan_items(id) ON DELETE SET NULL,
  issue_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  message TEXT NOT NULL,
  suggested_fix TEXT,
  simplicity_score_before INTEGER,
  simplicity_score_after INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_plan_simplification_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant simplification audits"
ON public.meal_plan_simplification_audit
FOR SELECT TO authenticated
USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_user_id = auth.uid()));

CREATE POLICY "Users can insert own tenant simplification audits"
ON public.meal_plan_simplification_audit
FOR INSERT TO authenticated
WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE owner_user_id = auth.uid()));

CREATE POLICY "Users can delete own tenant simplification audits"
ON public.meal_plan_simplification_audit
FOR DELETE TO authenticated
USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_user_id = auth.uid()));

CREATE INDEX idx_simplification_audit_plan ON public.meal_plan_simplification_audit(meal_plan_id);
CREATE INDEX idx_simplification_audit_tenant ON public.meal_plan_simplification_audit(tenant_id);
