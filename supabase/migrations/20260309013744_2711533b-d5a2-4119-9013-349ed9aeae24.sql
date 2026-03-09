
-- =============================================
-- PATIENT SUPPLEMENTS TABLE
-- =============================================
CREATE TABLE public.patient_supplements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL,
  nutritionist_id uuid NOT NULL,
  name text NOT NULL,
  dosage text NOT NULL DEFAULT '',
  frequency text NOT NULL DEFAULT 'daily',
  timing text NOT NULL DEFAULT 'morning',
  reason text,
  brand text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  icon text NOT NULL DEFAULT '💊',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_supplements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists manage patient supplements"
  ON public.patient_supplements FOR ALL
  USING (auth.uid() = nutritionist_id)
  WITH CHECK (auth.uid() = nutritionist_id);

CREATE POLICY "Patients view own supplements"
  ON public.patient_supplements FOR SELECT
  USING (auth.uid() = patient_id);

CREATE TRIGGER update_patient_supplements_updated_at
  BEFORE UPDATE ON public.patient_supplements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- PUSH SUBSCRIPTIONS TABLE
-- =============================================
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX idx_patient_supplements_patient_id ON public.patient_supplements(patient_id);
CREATE INDEX idx_patient_supplements_nutritionist_id ON public.patient_supplements(nutritionist_id);
