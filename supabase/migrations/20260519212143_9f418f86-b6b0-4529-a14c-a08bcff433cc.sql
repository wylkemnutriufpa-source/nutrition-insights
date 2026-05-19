-- Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('shared-meal-plans', 'shared-meal-plans', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public access to read objects in shared-meal-plans
CREATE POLICY "Public Access to shared-meal-plans"
ON storage.objects
FOR SELECT
USING (bucket_id = 'shared-meal-plans');

-- Allow authenticated users to upload to their own folder in shared-meal-plans
-- (If it already exists, this will do nothing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'shared_plans_upload_own'
    ) THEN
        CREATE POLICY "shared_plans_upload_own"
        ON storage.objects
        FOR INSERT
        WITH CHECK (
            bucket_id = 'shared-meal-plans' AND 
            (storage.foldername(name))[1] = auth.uid()::text
        );
    END IF;
END $$;

-- Update existing policies to ensure they are correct if needed
-- (The ones I saw earlier were already correct but used storage.foldername(name)[1])
