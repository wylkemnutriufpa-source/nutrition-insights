
-- Check-in table for patient feedback with weight, photos, difficulty
CREATE TABLE public.patient_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  nutritionist_id uuid NOT NULL,
  weight numeric NULL,
  feedback text NULL,
  difficulty text NULL DEFAULT 'medium',
  photo_front_url text NULL,
  photo_side_url text NULL,
  photo_back_url text NULL,
  status text NOT NULL DEFAULT 'pending',
  nutri_notes text NULL,
  nutri_action text NULL,
  protocol_activated_id uuid NULL REFERENCES public.protocols(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz NULL
);

-- Frequency config per patient relationship
ALTER TABLE public.nutritionist_patients 
  ADD COLUMN IF NOT EXISTS checkin_frequency text DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS last_checkin_reminder timestamptz NULL;

-- RLS
ALTER TABLE public.patient_checkins ENABLE ROW LEVEL SECURITY;

-- Patients can insert their own check-ins
CREATE POLICY "Patients insert own checkins"
  ON public.patient_checkins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = patient_id);

-- Patients can view their own check-ins
CREATE POLICY "Patients view own checkins"
  ON public.patient_checkins FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

-- Nutritionists can view their patients' check-ins
CREATE POLICY "Nutritionists view patient checkins"
  ON public.patient_checkins FOR SELECT
  TO authenticated
  USING (auth.uid() = nutritionist_id);

-- Nutritionists can update (review) check-ins
CREATE POLICY "Nutritionists update patient checkins"
  ON public.patient_checkins FOR UPDATE
  TO authenticated
  USING (auth.uid() = nutritionist_id);

-- Storage bucket for check-in photos
INSERT INTO storage.buckets (id, name, public) VALUES ('checkin-photos', 'checkin-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: patients upload their own photos
CREATE POLICY "Patients upload checkin photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'checkin-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Anyone can view checkin photos (public bucket)
CREATE POLICY "Public view checkin photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'checkin-photos');
