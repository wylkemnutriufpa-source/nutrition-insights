-- Allow nutritionists to update their patients' profiles
CREATE POLICY "Nutritionists can update patient profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = profiles.user_id
    AND np.nutritionist_id = auth.uid()
    AND np.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = profiles.user_id
    AND np.nutritionist_id = auth.uid()
    AND np.status = 'active'
  )
);

-- Allow admins to update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow personal trainers to update their students' profiles
CREATE POLICY "Personals can update student profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = profiles.user_id
    AND np.nutritionist_id = auth.uid()
    AND np.status = 'active'
  )
  AND public.has_role(auth.uid(), 'personal')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = profiles.user_id
    AND np.nutritionist_id = auth.uid()
    AND np.status = 'active'
  )
  AND public.has_role(auth.uid(), 'personal')
);