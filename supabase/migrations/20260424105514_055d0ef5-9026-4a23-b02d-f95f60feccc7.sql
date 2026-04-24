-- Async export tracking
CREATE TABLE IF NOT EXISTS public.export_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    format TEXT NOT NULL,
    status TEXT DEFAULT 'pending', 
    progress INT DEFAULT 0,
    file_url TEXT,
    error_message TEXT,
    filter_params JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.export_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own export tasks" ON public.export_tasks FOR SELECT USING (auth.uid() = user_id);

-- Optimized indexes for stable pagination and correlation lookups
CREATE INDEX IF NOT EXISTS idx_system_alerts_pagination ON public.system_alerts (created_at DESC, id DESC);

-- Conditional Index creation to avoid errors if columns are being renamed/missing in types but exist in DB
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meal_plans' AND column_name='status') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_meal_plans_patient_stats ON public.meal_plans (patient_id, status, plan_mode, is_active, created_at)';
    END IF;
END $$;

-- Metrics RPC for deltas and distribution
CREATE OR REPLACE FUNCTION public.get_plan_status_distribution(
    p_patient_id UUID,
    p_cutoff TIMESTAMP WITH TIME ZONE DEFAULT now() - interval '24 hours'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_stats_before JSONB;
    v_stats_after JSONB;
BEGIN
    -- Only run if columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meal_plans' AND column_name='status') THEN
        RETURN jsonb_build_object('error', 'Required columns missing in meal_plans');
    END IF;

    EXECUTE 'SELECT jsonb_object_agg(status_mode, cnt) FROM (
        SELECT COALESCE(status, ''null'') || ''_'' || COALESCE(plan_mode, ''weekly'') as status_mode, COUNT(*) as cnt
        FROM public.meal_plans 
        WHERE patient_id = $1 AND created_at < $2
        GROUP BY status, plan_mode
    ) s' INTO v_stats_before USING p_patient_id, p_cutoff;

    EXECUTE 'SELECT jsonb_object_agg(status_mode, cnt) FROM (
        SELECT COALESCE(status, ''null'') || ''_'' || COALESCE(plan_mode, ''weekly'') as status_mode, COUNT(*) as cnt
        FROM public.meal_plans 
        WHERE patient_id = $1 AND created_at >= $2
        GROUP BY status, plan_mode
    ) s' INTO v_stats_after USING p_patient_id, p_cutoff;

    RETURN jsonb_build_object(
        'before', COALESCE(v_stats_before, '{}'::jsonb),
        'after', COALESCE(v_stats_after, '{}'::jsonb),
        'timestamp', p_cutoff
    );
END;
$$;
