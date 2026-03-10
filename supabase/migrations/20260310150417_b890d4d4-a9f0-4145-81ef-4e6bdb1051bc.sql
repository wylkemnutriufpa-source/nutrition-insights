
-- Allow admins full CRUD on pricing_plans
CREATE POLICY "Admins manage pricing_plans"
  ON public.pricing_plans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins full CRUD on prestige_plans
CREATE POLICY "Admins manage prestige_plans"
  ON public.prestige_plans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins full CRUD on ranking_point_rules
CREATE POLICY "Admins manage ranking_point_rules"
  ON public.ranking_point_rules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
