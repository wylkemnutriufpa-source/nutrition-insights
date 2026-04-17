-- Security fix 1: Restrict nutrition_search_index to professionals/admins only
-- (patients never need to query the search index; the broad policy was leaking
-- titles/clinical_tags/strategy_tags across tenants)
DROP POLICY IF EXISTS "Anyone authenticated can read search index" ON public.nutrition_search_index;

-- Security fix 2: Tighten food_database SELECT so custom (proprietary) foods
-- are visible only to the owning nutritionist and their linked patients.
-- System foods (is_custom = false) remain publicly readable.
DROP POLICY IF EXISTS "Anyone can view food database" ON public.food_database;

CREATE POLICY "System foods readable by all authenticated"
ON public.food_database
FOR SELECT
TO authenticated
USING (is_custom = false OR is_custom IS NULL);

CREATE POLICY "Custom foods readable by owner nutritionist"
ON public.food_database
FOR SELECT
TO authenticated
USING (is_custom = true AND nutritionist_id = auth.uid());

CREATE POLICY "Custom foods readable by linked patients"
ON public.food_database
FOR SELECT
TO authenticated
USING (
  is_custom = true
  AND EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.nutritionist_id = food_database.nutritionist_id
      AND np.patient_id = auth.uid()
      AND np.status = 'active'
  )
);