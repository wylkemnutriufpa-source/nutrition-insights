-- Intensity enum
CREATE TYPE public.usage_intensity AS ENUM ('low', 'medium', 'high');

-- B2B scale scenarios table
CREATE TABLE public.operational_scale_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_name text NOT NULL,
  total_professionals integer NOT NULL DEFAULT 10,
  avg_patients_per_professional integer NOT NULL DEFAULT 80,
  ai_usage_intensity usage_intensity NOT NULL DEFAULT 'medium',
  storage_intensity usage_intensity NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.operational_scale_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage scale scenarios"
ON public.operational_scale_scenarios FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add B2B revenue config columns to operational_cost_configuration
ALTER TABLE public.operational_cost_configuration
  ADD COLUMN IF NOT EXISTS monthly_price_per_professional numeric NOT NULL DEFAULT 197.00,
  ADD COLUMN IF NOT EXISTS avg_stripe_fee_percent numeric NOT NULL DEFAULT 2.9,
  ADD COLUMN IF NOT EXISTS avg_ticket_per_patient numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cost_base_per_professional numeric NOT NULL DEFAULT 2.00;

-- Seed default B2B scenarios
INSERT INTO public.operational_scale_scenarios (scenario_name, total_professionals, avg_patients_per_professional, ai_usage_intensity, storage_intensity) VALUES
  ('Early Growth', 10, 80, 'medium', 'low'),
  ('Growth', 50, 120, 'medium', 'medium'),
  ('Scale', 150, 150, 'high', 'medium'),
  ('Dominância Regional', 400, 200, 'high', 'high');