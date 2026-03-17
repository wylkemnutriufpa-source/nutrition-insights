
-- Marketing assets auto-generated from feature_registry
CREATE TABLE public.feature_marketing_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id uuid NOT NULL REFERENCES public.feature_registry(id) ON DELETE CASCADE,
  slide_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  post_instagram_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  post_image_prompt text,
  caption text,
  status text NOT NULL DEFAULT 'draft',
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(feature_id)
);

ALTER TABLE public.feature_marketing_assets ENABLE ROW LEVEL SECURITY;

-- Only admins can manage marketing assets
CREATE POLICY "Admins can manage marketing assets"
  ON public.feature_marketing_assets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Nutritionists can view
CREATE POLICY "Nutritionists can view marketing assets"
  ON public.feature_marketing_assets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'nutritionist'));

-- Auto-update updated_at
CREATE TRIGGER update_feature_marketing_assets_updated_at
  BEFORE UPDATE ON public.feature_marketing_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
