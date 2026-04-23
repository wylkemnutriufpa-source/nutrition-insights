-- Enable RLS
ALTER TABLE public.clinical_engine_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy for viewing logs
CREATE POLICY "Nutritionists can view their patient's audit logs"
ON public.clinical_engine_audit_logs
FOR SELECT
USING (auth.uid() IN (
    SELECT nutritionist_id FROM public.nutritionist_patients WHERE patient_id = public.clinical_engine_audit_logs.patient_id
));

-- Allow service role (Edge Functions) full access - usually default, but explicit for clarity if needed
CREATE POLICY "Service role full access"
ON public.clinical_engine_audit_logs
FOR ALL
USING (true)
WITH CHECK (true);
-- Note: Service role usually bypasses RLS anyway.
