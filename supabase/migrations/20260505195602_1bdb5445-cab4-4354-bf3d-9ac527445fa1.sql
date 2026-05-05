-- 1. RLS Isolation for v3_drafts
ALTER TABLE public.v3_drafts ENABLE ROW LEVEL SECURITY;

-- Ensure users can only access drafts belonging to their tenant
-- This assumes a lookup through a tenant table or that tenant_id is on the draft
CREATE POLICY "Users can only access drafts from their active tenant"
ON public.v3_drafts
FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenants 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 2. Audit/Monitor logs for critical failures
CREATE TABLE IF NOT EXISTS public.critical_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'tenant_failure', 'draft_failure', 'save_failure'
  user_id UUID REFERENCES auth.users(id),
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.critical_logs ENABLE ROW LEVEL SECURITY;

-- Only admins/system can read, but users can insert their own logs
CREATE POLICY "Users can insert their own logs"
ON public.critical_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);
