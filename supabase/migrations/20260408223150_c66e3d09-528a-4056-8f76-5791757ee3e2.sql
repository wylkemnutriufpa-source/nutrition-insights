-- Fix: Remove overly permissive DELETE policy on patient-documents
DROP POLICY IF EXISTS "Nutritionists delete patient documents" ON storage.objects;

-- Create scoped DELETE policy that checks nutritionist-patient relationship
CREATE POLICY "Nutritionists delete own patient documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'patient-documents'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.nutritionist_id = auth.uid()
    AND np.patient_id::text = (storage.foldername(name))[1]
    AND np.status = 'active'
  )
);

-- Fix: Remove overly permissive upload policy (the specific one already exists)
DROP POLICY IF EXISTS "Nutritionists upload patient documents" ON storage.objects;