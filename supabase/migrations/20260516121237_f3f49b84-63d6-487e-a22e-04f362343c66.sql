-- Update runtime logs for richer evidence
ALTER TABLE sovereign_runtime_logs ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE sovereign_runtime_logs ADD COLUMN IF NOT EXISTS rpc_response JSONB;
ALTER TABLE sovereign_runtime_logs ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE sovereign_runtime_logs ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Create Operational Audit table
CREATE TABLE IF NOT EXISTS public.operational_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id TEXT NOT NULL,
    template_name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'VALIDADO', 'EM CURADORIA', 'FALHA'
    validation_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    validator_id UUID,
    validator_name TEXT,
    
    -- Evidence Checklist
    editor_ok BOOLEAN DEFAULT false,
    save_ok BOOLEAN DEFAULT false,
    reload_ok BOOLEAN DEFAULT false,
    publish_ok BOOLEAN DEFAULT false,
    patient_app_ok BOOLEAN DEFAULT false,
    pdf_ok BOOLEAN DEFAULT false,
    whatsapp_ok BOOLEAN DEFAULT false,
    week_complete BOOLEAN DEFAULT false,
    images_ok BOOLEAN DEFAULT false,
    equivalents_ok BOOLEAN DEFAULT false,
    persistence_ok BOOLEAN DEFAULT false,
    snapshot_ok BOOLEAN DEFAULT false,
    
    -- Technical Payloads
    save_payload JSONB,
    publish_payload JSONB,
    rpc_returned JSONB,
    error_log TEXT,
    
    -- Links
    pdf_generated_url TEXT,
    whatsapp_link TEXT,
    evidence_screenshots JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS for operational_audits (using a simpler policy since roles aren't in profiles table directly)
ALTER TABLE public.operational_audits ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view audits (since specific role checks are tricky without a 'role' column)
CREATE POLICY "Authenticated users can view audits"
ON public.operational_audits
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert audits"
ON public.operational_audits
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
