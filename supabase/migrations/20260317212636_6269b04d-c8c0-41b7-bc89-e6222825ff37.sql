-- Table: operational_cost_metrics (daily metrics snapshot)
CREATE TABLE public.operational_cost_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  total_active_patients integer NOT NULL DEFAULT 0,
  ai_calls_meal_analysis integer NOT NULL DEFAULT 0,
  ai_calls_body_projection integer NOT NULL DEFAULT 0,
  ai_calls_recipe_generation integer NOT NULL DEFAULT 0,
  ai_calls_reports integer NOT NULL DEFAULT 0,
  storage_images_mb numeric NOT NULL DEFAULT 0,
  edge_function_runs integer NOT NULL DEFAULT 0,
  push_notifications_sent integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(metric_date)
);

-- Table: operational_cost_configuration (admin-editable cost params)
CREATE TABLE public.operational_cost_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_per_ai_call_usd numeric NOT NULL DEFAULT 0.003,
  cost_per_100mb_storage_usd numeric NOT NULL DEFAULT 0.025,
  cost_per_1000_notifications_usd numeric NOT NULL DEFAULT 1.00,
  infrastructure_base_cost_usd numeric NOT NULL DEFAULT 20.00,
  stripe_fee_percent numeric NOT NULL DEFAULT 2.9,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Insert default configuration
INSERT INTO public.operational_cost_configuration (cost_per_ai_call_usd, cost_per_100mb_storage_usd, cost_per_1000_notifications_usd, infrastructure_base_cost_usd, stripe_fee_percent)
VALUES (0.003, 0.025, 1.00, 20.00, 2.9);

-- RLS: admin only
ALTER TABLE public.operational_cost_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_cost_configuration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read operational_cost_metrics"
ON public.operational_cost_metrics FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert operational_cost_metrics"
ON public.operational_cost_metrics FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read operational_cost_configuration"
ON public.operational_cost_configuration FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update operational_cost_configuration"
ON public.operational_cost_configuration FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));