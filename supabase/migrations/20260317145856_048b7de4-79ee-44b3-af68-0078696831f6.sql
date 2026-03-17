
-- Body assessment photos with versioning
CREATE TABLE public.body_assessment_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  assessment_date date NOT NULL DEFAULT CURRENT_DATE,
  front_image_url text,
  side_image_url text,
  back_image_url text,
  source text NOT NULL DEFAULT 'manual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.body_assessment_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own photos" ON public.body_assessment_photos
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert own photos" ON public.body_assessment_photos
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Nutritionists can view linked patient photos" ON public.body_assessment_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.nutritionist_id = auth.uid() AND np.patient_id = body_assessment_photos.patient_id AND np.status = 'active')
  );

CREATE POLICY "Nutritionists can insert for linked patients" ON public.body_assessment_photos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.nutritionist_id = auth.uid() AND np.patient_id = body_assessment_photos.patient_id AND np.status = 'active')
  );

CREATE INDEX idx_body_assessment_photos_patient ON public.body_assessment_photos(patient_id, assessment_date DESC);

-- Body projection snapshots
CREATE TABLE public.body_projection_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  timeframe text NOT NULL,
  current_body_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  projected_body_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  narrative text,
  confidence_score numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.body_projection_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own projections" ON public.body_projection_snapshots
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert own projections" ON public.body_projection_snapshots
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Nutritionists can view linked patient projections" ON public.body_projection_snapshots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.nutritionist_id = auth.uid() AND np.patient_id = body_projection_snapshots.patient_id AND np.status = 'active')
  );

CREATE POLICY "Nutritionists can insert for linked patients" ON public.body_projection_snapshots
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.nutritionist_id = auth.uid() AND np.patient_id = body_projection_snapshots.patient_id AND np.status = 'active')
  );

CREATE INDEX idx_body_projection_snapshots_patient ON public.body_projection_snapshots(patient_id, created_at DESC);
