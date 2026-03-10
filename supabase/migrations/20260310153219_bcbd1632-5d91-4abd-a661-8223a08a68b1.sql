-- Table to track user presence/last seen
CREATE TABLE public.user_presence (
  user_id uuid PRIMARY KEY NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  is_online boolean NOT NULL DEFAULT false,
  device_info text NULL
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Patients can upsert their own presence
CREATE POLICY "Users manage own presence"
ON public.user_presence
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can view all presence
CREATE POLICY "Admins view all presence"
ON public.user_presence
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Nutritionists can view their patients' presence
CREATE POLICY "Nutritionists view patient presence"
ON public.user_presence
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.nutritionist_patients np
  WHERE np.patient_id = user_presence.user_id
    AND np.nutritionist_id = auth.uid()
    AND np.status = 'active'
));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;