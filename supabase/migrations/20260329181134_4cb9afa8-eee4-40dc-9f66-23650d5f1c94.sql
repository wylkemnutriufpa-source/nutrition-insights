
-- 1. Create storage bucket for coach photos
INSERT INTO storage.buckets (id, name, public) VALUES ('coach-photos', 'coach-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for coach-photos bucket
CREATE POLICY "coach_photos_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'coach-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "coach_photos_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'coach-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "coach_photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'coach-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Add alert persistence fields  
ALTER TABLE public.coach_alerts
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS coach_note text;

-- 3. Add manual decision support to coach_decisions
ALTER TABLE public.coach_decisions
  ADD COLUMN IF NOT EXISTS is_manual boolean DEFAULT false;
