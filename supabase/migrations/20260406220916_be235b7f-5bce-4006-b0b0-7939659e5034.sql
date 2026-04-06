
-- Table for PIX payment configurations
CREATE TABLE public.pix_payment_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_label TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'professional',
  amount NUMERIC(10,2) NOT NULL,
  pix_code TEXT NOT NULL,
  qr_code_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pix_payment_configs ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active configs
CREATE POLICY "Authenticated users can read active pix configs"
  ON public.pix_payment_configs FOR SELECT TO authenticated
  USING (is_active = true);

-- Only admins can manage
CREATE POLICY "Admins can manage pix configs"
  ON public.pix_payment_configs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
