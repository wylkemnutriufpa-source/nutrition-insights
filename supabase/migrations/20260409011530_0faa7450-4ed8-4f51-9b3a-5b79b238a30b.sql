
-- 1. Add attendance_mode to nutritionist_patients
ALTER TABLE public.nutritionist_patients
ADD COLUMN IF NOT EXISTS attendance_mode text NOT NULL DEFAULT 'online';

-- 2. Create in_office_sessions table
CREATE TABLE IF NOT EXISTS public.in_office_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL,
  nutritionist_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  current_step integer NOT NULL DEFAULT 1,
  anamnesis_completed boolean NOT NULL DEFAULT false,
  assessment_completed boolean NOT NULL DEFAULT false,
  meal_plan_completed boolean NOT NULL DEFAULT false,
  meal_plan_id uuid NULL,
  notes text NULL,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_in_office_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

ALTER TABLE public.in_office_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists manage their in-office sessions"
  ON public.in_office_sessions FOR ALL TO authenticated
  USING (
    nutritionist_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = in_office_sessions.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    nutritionist_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Patients view own in-office sessions"
  ON public.in_office_sessions FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- 3. Create quick_meal_templates table
CREATE TABLE IF NOT EXISTS public.quick_meal_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nutritionist_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  template_name text NOT NULL DEFAULT 'Modelo sem nome',
  template_type text NOT NULL DEFAULT 'meal',
  meal_type text NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_calories numeric NOT NULL DEFAULT 0,
  total_protein numeric NOT NULL DEFAULT 0,
  total_carbs numeric NOT NULL DEFAULT 0,
  total_fat numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_quick_template_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

ALTER TABLE public.quick_meal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists manage own quick templates"
  ON public.quick_meal_templates FOR ALL TO authenticated
  USING (
    nutritionist_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    nutritionist_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 4. Triggers for updated_at
CREATE TRIGGER update_in_office_sessions_updated_at
  BEFORE UPDATE ON public.in_office_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quick_meal_templates_updated_at
  BEFORE UPDATE ON public.quick_meal_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_in_office_sessions_patient ON public.in_office_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_in_office_sessions_nutritionist ON public.in_office_sessions(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_quick_meal_templates_nutritionist ON public.quick_meal_templates(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_nutritionist_patients_attendance ON public.nutritionist_patients(attendance_mode);
