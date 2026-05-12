-- Create clinical_event_log table
CREATE TABLE IF NOT EXISTS public.clinical_event_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID, -- Removido FK para evitar erro de tabela inexistente
    type TEXT NOT NULL,
    before NUMERIC,
    after NUMERIC,
    meal_type TEXT,
    source_rule TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    day_of_week INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clinical_event_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role can do everything on clinical_event_log"
ON public.clinical_event_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can view clinical_event_log"
ON public.clinical_event_log
FOR SELECT
TO authenticated
USING (true);

-- Create divergence ranking view
CREATE OR REPLACE VIEW public.clinical_divergence_ranking AS
WITH total_audits AS (
    SELECT COUNT(*) as total FROM public.clinical_shadow_audit
)
SELECT 
    d_type as rule,
    COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_audits), 0) as frequency_pct,
    CASE 
        WHEN d_type = 'protein_clamp_violation' THEN 'critical'
        WHEN d_type = 'macro_drift' THEN 'high'
        WHEN d_type = 'meal_structure_mismatch' THEN 'medium'
        ELSE 'low'
    END as clinical_severity,
    COUNT(DISTINCT patient_id) as affected_patients,
    AVG(readiness_score) as avg_readiness,
    (100 - AVG(readiness_score)) as readiness_impact
FROM public.clinical_shadow_audit, unnest(divergence_types) as d_type
GROUP BY d_type, (SELECT total FROM total_audits)
ORDER BY readiness_impact DESC;
