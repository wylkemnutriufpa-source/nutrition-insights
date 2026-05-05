-- Ensure RLS is enabled
ALTER TABLE public.v3_drafts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see drafts from their active tenant
CREATE POLICY "Users can access drafts from their tenant"
ON public.v3_drafts
FOR ALL
USING (
  tenant_id = (SELECT get_user_active_tenant())
);
