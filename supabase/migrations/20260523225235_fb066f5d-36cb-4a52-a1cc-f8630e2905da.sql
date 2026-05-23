
-- 1) operational_audits: restrict SELECT to creator or admin
DROP POLICY IF EXISTS "Authenticated users can view audits" ON public.operational_audits;
CREATE POLICY "Creator or admin can view audits"
ON public.operational_audits
FOR SELECT
TO authenticated
USING (
  auth.uid() = validator_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 2) audit_plan_fetch_logs: bind INSERT to authenticated nutritionist
DROP POLICY IF EXISTS "Nutritionists can insert their own audit logs" ON public.audit_plan_fetch_logs;
CREATE POLICY "Nutritionists can insert their own audit logs"
ON public.audit_plan_fetch_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = nutritionist_id);

-- 3) storage: meal-photos — scope INSERT to user's own folder
DROP POLICY IF EXISTS "Authenticated users can upload meal photos" ON storage.objects;
CREATE POLICY "Users can upload meal photos to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meal-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4) storage: meal-visual-library — restrict INSERT to nutritionists/admins
DROP POLICY IF EXISTS "Authenticated users can upload meal visual images" ON storage.objects;
CREATE POLICY "Nutritionists and admins can upload meal visual images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meal-visual-library'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'nutritionist'::app_role)
  )
);
