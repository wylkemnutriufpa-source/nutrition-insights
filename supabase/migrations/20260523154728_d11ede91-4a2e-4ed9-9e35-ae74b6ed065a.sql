
-- 1. profiles: remove blanket public SELECT
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- 2. clinical_telemetry: restrict to authenticated staff/owners
DROP POLICY IF EXISTS "Clinical telemetry is viewable by staff" ON public.clinical_telemetry;
DROP POLICY IF EXISTS "Clinical telemetry can be inserted by anyone" ON public.clinical_telemetry;

CREATE POLICY "Clinical telemetry viewable by admin or owning nutritionist"
ON public.clinical_telemetry FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = clinical_telemetry.patient_id
      AND np.nutritionist_id = auth.uid()
      AND np.status = 'active'
  )
  OR clinical_telemetry.patient_id = auth.uid()
);

CREATE POLICY "Clinical telemetry insert by authenticated"
ON public.clinical_telemetry FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. v3_* reference tables: drop "Escrita total", keep public read, restrict writes to admin/nutritionist
DROP POLICY IF EXISTS "Escrita total v3_library_items" ON public.v3_library_items;
DROP POLICY IF EXISTS "Escrita total v3_library_images" ON public.v3_library_images;
DROP POLICY IF EXISTS "Escrita total v3_clusters" ON public.v3_clusters;
DROP POLICY IF EXISTS "Escrita total v3_substitutions" ON public.v3_substitutions;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['v3_library_items','v3_library_images','v3_clusters','v3_substitutions']
  LOOP
    EXECUTE format('CREATE POLICY "Admin/nutritionist insert %1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),''admin''::app_role) OR has_role(auth.uid(),''nutritionist''::app_role))', t);
    EXECUTE format('CREATE POLICY "Admin/nutritionist update %1$s" ON public.%1$s FOR UPDATE TO authenticated USING (has_role(auth.uid(),''admin''::app_role) OR has_role(auth.uid(),''nutritionist''::app_role)) WITH CHECK (has_role(auth.uid(),''admin''::app_role) OR has_role(auth.uid(),''nutritionist''::app_role))', t);
    EXECUTE format('CREATE POLICY "Admin delete %1$s" ON public.%1$s FOR DELETE TO authenticated USING (has_role(auth.uid(),''admin''::app_role))', t);
  END LOOP;
END $$;

-- 4. food_restrictions & meal_household_measures: enable RLS + public read + admin write
ALTER TABLE public.food_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_household_measures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read food_restrictions" ON public.food_restrictions FOR SELECT USING (true);
CREATE POLICY "Admin write food_restrictions" ON public.food_restrictions FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Public read meal_household_measures" ON public.meal_household_measures FOR SELECT USING (true);
CREATE POLICY "Admin write meal_household_measures" ON public.meal_household_measures FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
