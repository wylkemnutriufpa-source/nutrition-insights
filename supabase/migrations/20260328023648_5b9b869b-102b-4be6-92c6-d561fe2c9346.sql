
-- ═══════════════════════════════════════════════════════════
-- STORAGE HARDENING: Make clinical buckets private
-- ═══════════════════════════════════════════════════════════

-- 1) Make buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('body-images', 'checkin-photos', 'enrollment-photos', 'meal-images');

-- 2) Drop overly permissive SELECT policies
DROP POLICY IF EXISTS "Public read body images" ON storage.objects;
DROP POLICY IF EXISTS "Public view checkin photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view enrollment photos" ON storage.objects;
DROP POLICY IF EXISTS "Meal images are publicly accessible" ON storage.objects;

-- 3) Drop overly permissive INSERT policies (no folder check)
DROP POLICY IF EXISTS "Authenticated upload body images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload enrollment photos" ON storage.objects;

-- ═══════════════════════════════════════════════════════════
-- NEW SELECT POLICIES: owner OR linked professional OR admin
-- ═══════════════════════════════════════════════════════════

-- body-images: owner, linked professional, or admin can read
CREATE POLICY "body_images_select_owner_pro_admin" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'body-images'
  AND (
    -- owner (file in their folder)
    (storage.foldername(name))[1] = auth.uid()::text
    -- linked professional
    OR (storage.foldername(name))[1] IN (
      SELECT np.patient_id::text FROM nutritionist_patients np
      WHERE np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
    -- admin
    OR public.has_role(auth.uid(), 'admin')
    -- branding folder (public within org)
    OR (storage.foldername(name))[1] = 'branding'
  )
);

-- checkin-photos: owner, linked professional, or admin can read
CREATE POLICY "checkin_photos_select_owner_pro_admin" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'checkin-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[1] IN (
      SELECT np.patient_id::text FROM nutritionist_patients np
      WHERE np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- enrollment-photos: owner, linked professional, or admin can read
CREATE POLICY "enrollment_photos_select_owner_pro_admin" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'enrollment-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[1] IN (
      SELECT np.patient_id::text FROM nutritionist_patients np
      WHERE np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- meal-images: owner, linked professional, or admin can read
CREATE POLICY "meal_images_select_owner_pro_admin" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'meal-images'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[1] IN (
      SELECT np.patient_id::text FROM nutritionist_patients np
      WHERE np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- ═══════════════════════════════════════════════════════════
-- NEW INSERT POLICIES: folder ownership enforced
-- ═══════════════════════════════════════════════════════════

-- body-images: user can only upload to their own folder or branding folder
CREATE POLICY "body_images_insert_own_folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'body-images'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[1] = 'branding'
  )
);

-- enrollment-photos: user can only upload to their own folder
CREATE POLICY "enrollment_photos_insert_own_folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'enrollment-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
