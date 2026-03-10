
-- Create storage bucket for patient documents (plans, assessments)
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-documents', 'patient-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Nutritionists can upload files for their patients
CREATE POLICY "Nutritionists upload patient documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'patient-documents'
  AND has_role(auth.uid(), 'nutritionist'::app_role)
);

-- RLS: Nutritionists and patients can view documents  
CREATE POLICY "Users view patient documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'patient-documents'
  AND (
    -- Nutritionist who uploaded
    (storage.foldername(name))[1] IN (
      SELECT np.patient_id::text FROM nutritionist_patients np 
      WHERE np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
    OR
    -- Patient viewing own docs
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- RLS: Nutritionists can delete documents they uploaded
CREATE POLICY "Nutritionists delete patient documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'patient-documents'
  AND has_role(auth.uid(), 'nutritionist'::app_role)
);

-- Table to track uploaded documents metadata
CREATE TABLE public.patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  nutritionist_id UUID NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'meal_plan',
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  meal_plan_id UUID REFERENCES public.meal_plans(id) ON DELETE SET NULL,
  assessment_id UUID REFERENCES public.physical_assessments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists manage patient documents"
ON public.patient_documents FOR ALL
TO authenticated
USING (auth.uid() = nutritionist_id)
WITH CHECK (auth.uid() = nutritionist_id);

CREATE POLICY "Patients view own documents"
ON public.patient_documents FOR SELECT
TO authenticated
USING (auth.uid() = patient_id);
