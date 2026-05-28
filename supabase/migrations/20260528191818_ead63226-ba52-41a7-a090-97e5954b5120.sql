-- Create incident logs table for production governance
CREATE TABLE IF NOT EXISTS public.system_incident_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    title TEXT NOT NULL,
    module TEXT NOT NULL,
    description TEXT,
    root_cause TEXT,
    prevention TEXT,
    severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'MEDIUM',
    author_id UUID REFERENCES auth.users(id)
);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.system_incident_logs TO authenticated;
GRANT ALL ON public.system_incident_logs TO service_role;

-- Enable RLS
ALTER TABLE public.system_incident_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage incident logs" 
ON public.system_incident_logs 
FOR ALL 
TO authenticated 
USING (true); -- Em produção real, filtrar por role=admin
