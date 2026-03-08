
-- Patient anamnesis table
CREATE TABLE public.patient_anamnesis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_tmb numeric,
  computed_kcal_target numeric,
  computed_protein numeric,
  computed_carbs numeric,
  computed_fat numeric,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_anamnesis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can insert own anamnesis" ON public.patient_anamnesis
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Patients can update own anamnesis" ON public.patient_anamnesis
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Patients can view own anamnesis" ON public.patient_anamnesis
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Nutritionists can view patient anamnesis" ON public.patient_anamnesis
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = patient_anamnesis.user_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

-- Patient tips table
CREATE TABLE public.patient_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tip text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  icon text NOT NULL DEFAULT '💡',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own tips" ON public.patient_tips
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Patients can update own tips" ON public.patient_tips
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Nutritionists can manage patient tips" ON public.patient_tips
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = patient_tips.user_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

-- Plan schedules table
CREATE TABLE public.plan_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  activate_at date NOT NULL,
  deactivate_at date,
  criteria jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists can manage plan schedules" ON public.plan_schedules
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp
      WHERE mp.id = plan_schedules.meal_plan_id
        AND mp.nutritionist_id = auth.uid()
    )
  );

CREATE POLICY "Patients can view plan schedules" ON public.plan_schedules
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp
      WHERE mp.id = plan_schedules.meal_plan_id
        AND mp.patient_id = auth.uid()
    )
  );

-- Trigger for updated_at on anamnesis
CREATE TRIGGER update_anamnesis_updated_at
  BEFORE UPDATE ON public.patient_anamnesis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
