-- Add editor_version to meal_plan_items
ALTER TABLE public.meal_plan_items ADD COLUMN IF NOT EXISTS editor_version TEXT DEFAULT 'v2';

-- Fix permissions for meal_plan_items
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plan_items TO authenticated;
GRANT ALL ON public.meal_plan_items TO service_role;

-- Fix permissions for audit_exports_log
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_exports_log TO authenticated;
GRANT ALL ON public.audit_exports_log TO service_role;

-- Ensure RLS is enabled
ALTER TABLE public.audit_exports_log ENABLE ROW LEVEL SECURITY;

-- Policy for audit_exports_log (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own export logs' AND tablename = 'audit_exports_log') THEN
        CREATE POLICY "Users can insert own export logs" 
        ON public.audit_exports_log 
        FOR INSERT 
        TO authenticated
        WITH CHECK (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own export logs' AND tablename = 'audit_exports_log') THEN
        CREATE POLICY "Users can view own export logs" 
        ON public.audit_exports_log 
        FOR SELECT 
        TO authenticated
        USING (user_id = auth.uid());
    END IF;
END $$;

-- Storage Policy for shared-meal-plans bucket
-- Allow public access to view shared plans
INSERT INTO storage.buckets (id, name, public) 
VALUES ('shared-meal-plans', 'shared-meal-plans', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public Access to Shared Plans" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'shared-meal-plans');

-- Ensure professionals can upload to shared-meal-plans
CREATE POLICY "Professionals can upload shared plans" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'shared-meal-plans' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);
