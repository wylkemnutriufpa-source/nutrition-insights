
-- Add booking payment fields to public_profile_settings
ALTER TABLE public.public_profile_settings 
ADD COLUMN IF NOT EXISTS booking_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS booking_payment_required boolean DEFAULT false;

-- Add booking payment confirmation tracking
CREATE TABLE IF NOT EXISTS public.booking_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id uuid NOT NULL,
  lead_request_id uuid REFERENCES public.lead_requests(id),
  customer_email text NOT NULL,
  customer_name text NOT NULL,
  amount numeric NOT NULL,
  stripe_session_id text,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists can view their booking payments" ON public.booking_payments
  FOR SELECT TO authenticated
  USING (nutritionist_id IN (
    SELECT np.nutritionist_id FROM public.nutritionist_patients np WHERE np.patient_id = auth.uid()
  ) OR nutritionist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert booking payments" ON public.booking_payments
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "System can update booking payments" ON public.booking_payments
  FOR UPDATE TO authenticated
  USING (nutritionist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
