
-- Fix meal-photos DELETE policy to require ownership
DROP POLICY IF EXISTS "Authenticated users can delete meal photos" ON storage.objects;
CREATE POLICY "Owner can delete meal photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'meal-photos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Fix meal-photos UPDATE policy to require ownership
DROP POLICY IF EXISTS "Authenticated users can update meal photos" ON storage.objects;
CREATE POLICY "Owner can update meal photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'meal-photos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
