
CREATE TABLE public.autofix_backups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_plan_id UUID NOT NULL,
  original_items JSONB NOT NULL,
  original_plan_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES public.tenants(id),
  restored_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.autofix_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own autofix backups"
ON public.autofix_backups
FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE INDEX idx_autofix_backups_plan ON public.autofix_backups(meal_plan_id);
