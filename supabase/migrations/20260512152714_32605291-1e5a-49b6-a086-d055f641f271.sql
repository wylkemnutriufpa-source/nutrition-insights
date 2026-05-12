CREATE TABLE public.clinical_shadow_audit (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id UUID,
    patient_id UUID,
    v1_hash TEXT,
    v2_hash TEXT,
    divergence_count INTEGER DEFAULT 0,
    compatible BOOLEAN DEFAULT TRUE,
    payload_diff JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.clinical_shadow_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for authenticated users" 
ON public.clinical_shadow_audit 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Enable select for authenticated users" 
ON public.clinical_shadow_audit 
FOR SELECT 
USING (true);