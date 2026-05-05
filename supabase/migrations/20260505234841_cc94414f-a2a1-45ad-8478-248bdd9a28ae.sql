
-- Bucket público para armazenar planos alimentares compartilhados
INSERT INTO storage.buckets (id, name, public)
VALUES ('shared-meal-plans', 'shared-meal-plans', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Profissional autenticado pode fazer upload em sua própria pasta (user_id/...)
DROP POLICY IF EXISTS "shared_plans_upload_own" ON storage.objects;
CREATE POLICY "shared_plans_upload_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shared-meal-plans'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "shared_plans_update_own" ON storage.objects;
CREATE POLICY "shared_plans_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shared-meal-plans'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "shared_plans_delete_own" ON storage.objects;
CREATE POLICY "shared_plans_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shared-meal-plans'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Leitura pública (bucket é público)
DROP POLICY IF EXISTS "shared_plans_public_read" ON storage.objects;
CREATE POLICY "shared_plans_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'shared-meal-plans');
