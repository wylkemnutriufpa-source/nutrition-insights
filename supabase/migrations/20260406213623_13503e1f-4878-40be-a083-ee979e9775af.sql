-- 1. Fix meal_analysis_cache: restrict SELECT to admin + nutritionist (system cache)
DROP POLICY IF EXISTS "Authenticated read meal_analysis_cache" ON public.meal_analysis_cache;

CREATE POLICY "Admin and nutritionist read meal_analysis_cache"
  ON public.meal_analysis_cache FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'nutritionist'::app_role)
  );

-- 2. Fix meal-visual-library storage: restrict DELETE to nutritionist/admin with role check
DROP POLICY IF EXISTS "Authenticated users can manage meal visual images" ON storage.objects;

CREATE POLICY "Nutritionists and admins can delete meal visual images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'meal-visual-library'
    AND (
      has_role(auth.uid(), 'nutritionist'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- 3. Fix meal-visual-library storage: restrict UPDATE to nutritionist/admin
DROP POLICY IF EXISTS "Authenticated users can update meal visual images" ON storage.objects;

CREATE POLICY "Nutritionists and admins can update meal visual images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'meal-visual-library'
    AND (
      has_role(auth.uid(), 'nutritionist'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );