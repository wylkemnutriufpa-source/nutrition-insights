
CREATE TABLE public.smart_generated_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_type text NOT NULL DEFAULT 'feature',
  theme text NOT NULL DEFAULT 'neon_green',
  tone text NOT NULL DEFAULT 'inspirational',
  title text NOT NULL,
  subtitle text,
  bullets jsonb NOT NULL DEFAULT '[]'::jsonb,
  cta_text text,
  icon_suggestion text,
  animation_suggestion text,
  soundtrack_suggestion text,
  visual_style jsonb NOT NULL DEFAULT '{}'::jsonb,
  gradient text DEFAULT 'from-emerald-500 to-teal-600',
  emoji text DEFAULT '✨',
  target_audience text NOT NULL DEFAULT 'both',
  source_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.smart_generated_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage smart slides"
  ON public.smart_generated_slides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Nutritionists can manage smart slides"
  ON public.smart_generated_slides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'nutritionist'))
  WITH CHECK (public.has_role(auth.uid(), 'nutritionist'));

CREATE POLICY "Patients can view active slides"
  ON public.smart_generated_slides FOR SELECT TO authenticated
  USING (status = 'active');

CREATE TRIGGER update_smart_generated_slides_updated_at
  BEFORE UPDATE ON public.smart_generated_slides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
