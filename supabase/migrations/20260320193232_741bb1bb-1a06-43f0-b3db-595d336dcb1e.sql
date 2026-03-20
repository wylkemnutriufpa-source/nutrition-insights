
-- Patient Behavioral Tasks (checklist generated from clinical flags)
CREATE TABLE public.patient_behavioral_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  source_flag TEXT,
  template_code TEXT,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily',
  priority INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  generated_by TEXT NOT NULL DEFAULT 'rule_engine',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Patient Clinical Messages (generated from clinical flags)
CREATE TABLE public.patient_clinical_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  source_flag TEXT,
  message_code TEXT,
  channel TEXT NOT NULL DEFAULT 'dashboard_highlight',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'active',
  generated_by TEXT NOT NULL DEFAULT 'rule_engine',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.patient_behavioral_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_clinical_messages ENABLE ROW LEVEL SECURITY;

-- Patients can see their own tasks
CREATE POLICY "patients_own_tasks" ON public.patient_behavioral_tasks
  FOR ALL TO authenticated
  USING (patient_id = auth.uid());

-- Nutritionists can see tasks of their patients
CREATE POLICY "nutritionists_patient_tasks" ON public.patient_behavioral_tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = patient_behavioral_tasks.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

-- Patients can see their own messages
CREATE POLICY "patients_own_messages" ON public.patient_clinical_messages
  FOR ALL TO authenticated
  USING (patient_id = auth.uid());

-- Nutritionists can see messages of their patients
CREATE POLICY "nutritionists_patient_messages" ON public.patient_clinical_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = patient_clinical_messages.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

-- Index for fast lookups
CREATE INDEX idx_behavioral_tasks_patient ON public.patient_behavioral_tasks(patient_id, status);
CREATE INDEX idx_clinical_messages_patient ON public.patient_clinical_messages(patient_id, status);
