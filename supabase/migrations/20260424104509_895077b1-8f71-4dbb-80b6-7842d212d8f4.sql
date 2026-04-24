-- Track reconciliation efforts
CREATE TABLE IF NOT EXISTS public.plan_reconciliation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES public.meal_plans(id) ON DELETE CASCADE,
    correlation_id UUID,
    issue_detected TEXT,
    fixed_at TIMESTAMP WITH TIME ZONE,
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for timeline lookups
CREATE INDEX IF NOT EXISTS idx_meal_plans_correlation ON public.meal_plans(correlation_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_correlation ON public.system_alerts(correlation_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_master ON public.meal_plan_items(master_item_id);

-- Job function to reconcile inconsistencies
CREATE OR REPLACE FUNCTION public.reconcile_published_plans(p_limit INT DEFAULT 10)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_plan_id UUID;
    v_correlation_id UUID;
    v_count INT := 0;
BEGIN
    FOR v_plan_id IN 
        SELECT id FROM public.meal_plans 
        WHERE status = 'published' 
        AND plan_mode = 'single_day'
        AND is_active = true
        LIMIT p_limit
    LOOP
        v_correlation_id := gen_random_uuid();
        
        -- Use the existing repair logic to ensure day 0 is synced to 1-6
        PERFORM public.repair_single_day_plan(v_plan_id);
        
        INSERT INTO public.plan_reconciliation_queue (plan_id, correlation_id, issue_detected)
        VALUES (v_plan_id, v_correlation_id, 'Routine consistency check');
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN jsonb_build_object('processed', v_count);
END;
$$;
