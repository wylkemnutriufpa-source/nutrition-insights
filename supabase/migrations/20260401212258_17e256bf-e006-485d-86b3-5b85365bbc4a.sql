
-- Create exercise video library table
CREATE TABLE public.exercise_video_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  muscle_group TEXT NOT NULL DEFAULT 'Outro',
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  tenant_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exercise_video_library ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own and public videos"
ON public.exercise_video_library
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can create own videos"
ON public.exercise_video_library
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own videos"
ON public.exercise_video_library
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own videos"
ON public.exercise_video_library
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Index for search
CREATE INDEX idx_exercise_video_library_user ON public.exercise_video_library(user_id);
CREATE INDEX idx_exercise_video_library_muscle ON public.exercise_video_library(muscle_group);
CREATE INDEX idx_exercise_video_library_tags ON public.exercise_video_library USING GIN(tags);

-- Storage bucket for exercise videos
INSERT INTO storage.buckets (id, name, public) VALUES ('exercise-videos', 'exercise-videos', false);

-- Storage policies
CREATE POLICY "Users can view own exercise videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'exercise-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own exercise videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'exercise-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own exercise videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'exercise-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
