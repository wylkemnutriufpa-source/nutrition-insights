
-- Fix infinite recursion: drop the patient policy that causes the loop
DROP POLICY IF EXISTS "Patients view enrolled programs" ON public.programs;

-- Recreate using a security definer function to break recursion
CREATE OR REPLACE FUNCTION public.is_patient_enrolled_in_program(_user_id uuid, _program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.program_patients
    WHERE patient_id = _user_id AND program_id = _program_id AND status = 'active'
  )
$$;

CREATE POLICY "Patients view enrolled programs"
ON public.programs FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by
  OR public.is_patient_enrolled_in_program(auth.uid(), id)
);

-- Also fix the program_patients policy to avoid recursion from the other side
DROP POLICY IF EXISTS "Nutritionists manage program patients" ON public.program_patients;

CREATE OR REPLACE FUNCTION public.is_program_owner(_user_id uuid, _program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.programs
    WHERE id = _program_id AND created_by = _user_id
  )
$$;

CREATE POLICY "Nutritionists manage program patients"
ON public.program_patients FOR ALL
TO authenticated
USING (public.is_program_owner(auth.uid(), program_id))
WITH CHECK (public.is_program_owner(auth.uid(), program_id));

-- Fix program_timeline too
DROP POLICY IF EXISTS "Nutritionists manage program timeline" ON public.program_timeline;

CREATE POLICY "Nutritionists manage program timeline"
ON public.program_timeline FOR ALL
TO authenticated
USING (public.is_program_owner(auth.uid(), program_id))
WITH CHECK (public.is_program_owner(auth.uid(), program_id));

-- Also drop the old nutritionist ALL policy on programs to avoid conflict
DROP POLICY IF EXISTS "Nutritionists manage own programs" ON public.programs;
