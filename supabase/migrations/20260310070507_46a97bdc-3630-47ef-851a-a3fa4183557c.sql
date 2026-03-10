-- FIX: CRITICAL - Add restrictive write policies to user_roles (only admins can modify)
CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- FIX: Restrict nutritionist subscription access to SELECT only
DROP POLICY IF EXISTS "Nutritionists manage patient subscriptions" ON public.subscriptions;

CREATE POLICY "Nutritionists view patient subscriptions"
ON public.subscriptions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM nutritionist_patients np
    WHERE np.patient_id = subscriptions.user_id
    AND np.nutritionist_id = auth.uid()
    AND np.status = 'active'
  )
);