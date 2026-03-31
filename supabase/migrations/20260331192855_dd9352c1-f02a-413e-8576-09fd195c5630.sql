
-- STABILIZATION SPRINT: Fix conflicting/redundant RLS policies

-- 1. Fix meal_plans: Remove redundant SELECT policy that doesn't check tenant
-- patients_no_drafts duplicates logic of the tenant-scoped policy but without tenant isolation
DROP POLICY IF EXISTS "Nutritionists and patients can view meal plans" ON public.meal_plans;

-- 2. Update patients_no_drafts to include tenant check for non-admin users
DROP POLICY IF EXISTS "patients_no_drafts" ON public.meal_plans;
CREATE POLICY "patients_no_drafts" ON public.meal_plans
FOR SELECT TO authenticated
USING (
  (nutritionist_id = auth.uid()) 
  OR (
    (patient_id = auth.uid()) 
    AND (plan_status NOT IN ('draft', 'draft_auto_generated', 'under_professional_review', 'revision_requested'))
  )
);

-- 3. Remove duplicate INSERT policy on nutritionist_patients
DROP POLICY IF EXISTS "Nutritionists can add patients" ON public.nutritionist_patients;
-- Keep "Nutritionists can insert patients" which has tenant check
