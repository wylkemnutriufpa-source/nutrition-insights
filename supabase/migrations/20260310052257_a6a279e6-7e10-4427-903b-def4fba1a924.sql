
-- Platform-level feature tier settings (admin manages which features are basic/premium/coming_soon)
CREATE TABLE public.platform_feature_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name text NOT NULL UNIQUE,
  tier text NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'premium', 'coming_soon')),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.platform_feature_tiers ENABLE ROW LEVEL SECURITY;

-- Admins can manage feature tiers
CREATE POLICY "Admins manage feature tiers"
ON public.platform_feature_tiers FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can read feature tiers (needed to check access)
CREATE POLICY "Authenticated users read feature tiers"
ON public.platform_feature_tiers FOR SELECT
TO authenticated
USING (true);
