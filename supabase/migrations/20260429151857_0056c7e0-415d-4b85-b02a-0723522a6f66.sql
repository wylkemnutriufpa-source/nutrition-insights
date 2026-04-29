CREATE TABLE public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    level TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    section TEXT NOT NULL,
    message TEXT NOT NULL,
    stack TEXT,
    route TEXT,
    user_id UUID,
    correlation_id TEXT NOT NULL,
    metadata JSONB,
    is_resolved BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert system logs" 
ON public.system_logs FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can view system logs" 
ON public.system_logs FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE OR REPLACE VIEW public.system_health_summary AS
SELECT 
    COUNT(*) as total_errors,
    COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical_errors,
    COUNT(*) FILTER (WHERE created_at > now() - interval '1 hour') as errors_last_hour,
    CASE 
        WHEN COUNT(*) FILTER (WHERE severity = 'CRITICAL' AND created_at > now() - interval '1 hour') > 0 THEN 'CRITICAL'
        WHEN COUNT(*) FILTER (WHERE created_at > now() - interval '15 minutes') > 10 THEN 'UNSTABLE'
        ELSE 'HEALTHY'
    END as status
FROM public.system_logs
WHERE created_at > now() - interval '24 hours';