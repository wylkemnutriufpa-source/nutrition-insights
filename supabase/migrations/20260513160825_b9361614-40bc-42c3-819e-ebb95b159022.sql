CREATE TABLE public.sovereign_runtime_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id TEXT,
    runtime_source TEXT NOT NULL, -- e.g. 'editor_v3', 'patient_app', 'pdf_generator'
    event_type TEXT NOT NULL, -- e.g. 'schema_violation', 'hydration_blocked', 'legacy_detected'
    severity TEXT NOT NULL, -- 'info', 'warning', 'critical'
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    editor_version TEXT,
    snapshot_version TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sovereign_runtime_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users (assuming they are staff/nutris)
-- In a real scenario, we might want a specific 'admin' role, 
-- but for now, we follow the existing pattern of authenticated access.
CREATE POLICY "Authenticated users can view logs" 
ON public.sovereign_runtime_logs 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow insert from authenticated users (the app reporting issues)
CREATE POLICY "Authenticated users can insert logs" 
ON public.sovereign_runtime_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_sovereign_logs_correlation_id ON public.sovereign_runtime_logs(correlation_id);
CREATE INDEX idx_sovereign_logs_event_type ON public.sovereign_runtime_logs(event_type);
CREATE INDEX idx_sovereign_logs_created_at ON public.sovereign_runtime_logs(created_at DESC);
