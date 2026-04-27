-- 1. Grant permissions
GRANT EXECUTE ON FUNCTION public.ensure_patient_ready(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.run_patient_realtime_fix(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.resolve_patient_lifecycle_state(uuid) TO authenticated, anon;

-- 2. Fix potential missing columns reported in logs (defensive)
-- These might be leftovers from failed migrations or old code
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'current_weight') THEN
        ALTER TABLE public.profiles ADD COLUMN current_weight NUMERIC;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_item_completions' AND column_name = 'status') THEN
        ALTER TABLE public.meal_item_completions ADD COLUMN status TEXT DEFAULT 'completed';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_clinical_flags' AND column_name = 'severity') THEN
        ALTER TABLE public.patient_clinical_flags ADD COLUMN severity TEXT DEFAULT 'info';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_behavioral_tasks' AND column_name = 'category') THEN
        ALTER TABLE public.patient_behavioral_tasks ADD COLUMN category TEXT DEFAULT 'general';
    END IF;
END $$;