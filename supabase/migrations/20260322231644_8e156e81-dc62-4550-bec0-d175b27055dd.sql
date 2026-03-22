
-- 1. Meal feedback/rating table
CREATE TABLE public.meal_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  meal_plan_id UUID REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  meal_plan_item_id UUID,
  meal_type TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('liked', 'disliked')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients manage own feedback" ON public.meal_feedback
  FOR ALL TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Nutritionists read patient feedback" ON public.meal_feedback
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = meal_feedback.patient_id
      AND np.nutritionist_id = auth.uid()
      AND np.status = 'active'
    )
  );

CREATE INDEX idx_meal_feedback_patient ON public.meal_feedback(patient_id);
CREATE INDEX idx_meal_feedback_plan ON public.meal_feedback(meal_plan_id);

-- 2. Professional setup progress table
CREATE TABLE public.professional_setup_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  steps_completed JSONB NOT NULL DEFAULT '{}',
  is_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.professional_setup_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own setup" ON public.professional_setup_progress
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Appointment reminders table
CREATE TABLE public.appointment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.patient_appointments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL DEFAULT 'before_24h',
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists manage reminders" ON public.appointment_reminders
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_appointments pa
      WHERE pa.id = appointment_reminders.appointment_id
      AND pa.nutritionist_id = auth.uid()
    )
  );

CREATE INDEX idx_appointment_reminders_apt ON public.appointment_reminders(appointment_id);
