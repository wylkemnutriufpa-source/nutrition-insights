-- Clinical file access audit log
CREATE TABLE IF NOT EXISTS public.clinical_file_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bucket text NOT NULL,
  file_path text NOT NULL,
  access_type text NOT NULL DEFAULT 'view',
  accessed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text
);

-- RLS: only admins can read, users can insert their own
ALTER TABLE public.clinical_file_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users log own access"
  ON public.clinical_file_access_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins read all access logs"
  ON public.clinical_file_access_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for queries
CREATE INDEX idx_file_access_bucket_path ON public.clinical_file_access_log (bucket, file_path);
CREATE INDEX idx_file_access_user ON public.clinical_file_access_log (user_id);
CREATE INDEX idx_file_access_time ON public.clinical_file_access_log (accessed_at DESC);