
-- Supplement intake logs
CREATE TABLE public.supplement_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplement_id uuid NOT NULL REFERENCES public.patient_supplements(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  taken_at timestamp with time zone NOT NULL DEFAULT now(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(supplement_id, patient_id, date)
);

ALTER TABLE public.supplement_logs ENABLE ROW LEVEL SECURITY;

-- Patients can manage their own logs
CREATE POLICY "Patients manage own supplement logs"
  ON public.supplement_logs FOR ALL
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- Nutritionists can view logs of their patients
CREATE POLICY "Nutritionists view patient supplement logs"
  ON public.supplement_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = supplement_logs.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );
