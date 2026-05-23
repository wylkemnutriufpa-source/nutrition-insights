DROP POLICY IF EXISTS "Authenticated can insert own audit" ON public.clinical_audit_logs;
DROP POLICY IF EXISTS "Authenticated users insert audit logs" ON public.clinical_audit_logs;

CREATE POLICY "Authenticated can insert own audit"
ON public.clinical_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
