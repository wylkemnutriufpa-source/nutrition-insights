
-- Table to store which features each prestige plan tier allows for patients
CREATE TABLE public.patient_plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.prestige_plans(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, feature_key)
);

ALTER TABLE public.patient_plan_features ENABLE ROW LEVEL SECURITY;

-- Admins full CRUD
CREATE POLICY "Admins manage patient_plan_features"
  ON public.patient_plan_features FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- All authenticated users can read (to check their own access)
CREATE POLICY "Authenticated read patient_plan_features"
  ON public.patient_plan_features FOR SELECT
  TO authenticated
  USING (true);
