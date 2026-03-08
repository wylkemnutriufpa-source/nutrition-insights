
-- Agenda/appointments table for patient panel
CREATE TABLE public.patient_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  nutritionist_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  appointment_type text NOT NULL DEFAULT 'consultation',
  appointment_date timestamp with time zone NOT NULL,
  duration_minutes integer DEFAULT 60,
  status text NOT NULL DEFAULT 'scheduled',
  color text DEFAULT '#10b981',
  reminder_sent boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_appointments ENABLE ROW LEVEL SECURITY;

-- Nutritionists full CRUD on their appointments
CREATE POLICY "Nutritionists manage own appointments"
  ON public.patient_appointments FOR ALL
  TO authenticated
  USING (auth.uid() = nutritionist_id)
  WITH CHECK (auth.uid() = nutritionist_id);

-- Patients can view their own appointments
CREATE POLICY "Patients view own appointments"
  ON public.patient_appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

-- Trigger for updated_at
CREATE TRIGGER update_patient_appointments_updated_at
  BEFORE UPDATE ON public.patient_appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
