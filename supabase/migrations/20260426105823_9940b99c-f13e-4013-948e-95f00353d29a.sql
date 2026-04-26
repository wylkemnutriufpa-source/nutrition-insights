-- Create storage bucket for body photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('body-photos', 'body-photos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for body-photos bucket
CREATE POLICY "Patients can upload their own body photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'body-photos' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Patients can view their own body photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'body-photos' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Nutritionists can view their patients' body photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'body-photos' AND 
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.nutritionist_id = auth.uid()
    AND np.patient_id::text = (storage.foldername(name))[1]
    AND np.status = 'active'
  )
);

CREATE POLICY "Nutritionists can upload their patients' body photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'body-photos' AND 
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.nutritionist_id = auth.uid()
    AND np.patient_id::text = (storage.foldername(name))[1]
    AND np.status = 'active'
  )
);