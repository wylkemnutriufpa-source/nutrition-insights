-- Update clinical_shadow_audit table
ALTER TABLE public.clinical_shadow_audit 
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info',
ADD COLUMN IF NOT EXISTS divergence_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS analysis JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS readiness_score NUMERIC DEFAULT 0;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_shadow_audit_generated_at ON public.clinical_shadow_audit(generated_at);
CREATE INDEX IF NOT EXISTS idx_shadow_audit_compatible ON public.clinical_shadow_audit(compatible);

-- Create a view for daily metrics
CREATE OR REPLACE VIEW public.clinical_observability_dashboard AS
WITH daily_stats AS (
    SELECT 
        date_trunc('day', generated_at) as audit_date,
        COUNT(*) as total_samples,
        COUNT(*) FILTER (WHERE compatible) as compatible_count,
        AVG(readiness_score) as avg_readiness,
        AVG(divergence_count) as avg_divergence_count
    FROM public.clinical_shadow_audit
    GROUP BY 1
),
type_stats AS (
    SELECT 
        date_trunc('day', generated_at) as audit_date,
        t as divergence_type,
        COUNT(*) as occurrence_count
    FROM public.clinical_shadow_audit,
    unnest(divergence_types) t
    GROUP BY 1, 2
)
SELECT 
    d.audit_date,
    d.total_samples,
    ROUND((d.compatible_count::numeric / d.total_samples::numeric) * 100, 2) as compatibility_rate,
    ROUND(d.avg_readiness::numeric, 2) as readiness_score,
    ROUND(d.avg_divergence_count::numeric, 2) as avg_divergence_per_plan,
    (
        SELECT jsonb_object_agg(divergence_type, occurrence_count)
        FROM type_stats ts
        WHERE ts.audit_date = d.audit_date
    ) as divergence_heatmap
FROM daily_stats d
ORDER BY d.audit_date DESC;

-- Create a view for Legacy Rule Heatmap
-- This assumes we flag legacy rules in divergence_types like 'rule_smart_mode', 'rule_marmita_freeze'
CREATE OR REPLACE VIEW public.legacy_rule_heatmap AS
SELECT 
    t as legacy_rule,
    COUNT(*) as impact_count,
    ROUND(AVG(readiness_score), 2) as readiness_with_rule,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_failures
FROM public.clinical_shadow_audit,
unnest(divergence_types) t
WHERE t LIKE 'rule_%'
GROUP BY 1
ORDER BY impact_count DESC;
