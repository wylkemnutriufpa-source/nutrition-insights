-- Allow admins to delete prestige plans
CREATE POLICY "Admins can delete prestige_plans"
ON public.prestige_plans
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to insert prestige plans
CREATE POLICY "Admins can insert prestige_plans"
ON public.prestige_plans
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update prestige plans
CREATE POLICY "Admins can update prestige_plans"
ON public.prestige_plans
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete pricing plans
CREATE POLICY "Admins can delete pricing_plans"
ON public.pricing_plans
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to insert pricing plans  
CREATE POLICY "Admins can insert pricing_plans"
ON public.pricing_plans
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update pricing plans
CREATE POLICY "Admins can update pricing_plans"
ON public.pricing_plans
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));