
-- Branding settings per nutritionist
CREATE TABLE public.branding_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id uuid NOT NULL UNIQUE,
  brand_name text DEFAULT '',
  logo_url text,
  primary_color text DEFAULT '#10b981',
  secondary_color text DEFAULT '#1a1a2e',
  accent_color text DEFAULT '#f59e0b',
  custom_css text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists manage own branding" ON public.branding_settings
  FOR ALL TO authenticated
  USING (auth.uid() = nutritionist_id)
  WITH CHECK (auth.uid() = nutritionist_id);

-- Patients can view their nutritionist's branding
CREATE POLICY "Patients view nutritionist branding" ON public.branding_settings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM nutritionist_patients np
    WHERE np.patient_id = auth.uid() AND np.nutritionist_id = branding_settings.nutritionist_id AND np.status = 'active'
  ));

-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  action_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Allow system inserts (nutritionists can notify their patients)
CREATE POLICY "Nutritionists notify patients" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = notifications.user_id AND np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
  );

-- Create body-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('body-images', 'body-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for body-images
CREATE POLICY "Authenticated upload body images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'body-images');

CREATE POLICY "Public read body images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'body-images');

-- Update trigger for branding
CREATE TRIGGER update_branding_updated_at
  BEFORE UPDATE ON public.branding_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
