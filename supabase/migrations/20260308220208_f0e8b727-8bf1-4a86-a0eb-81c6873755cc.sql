
-- Physical assessments table
CREATE TABLE public.physical_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  assessor_id uuid NOT NULL,
  assessment_date date NOT NULL DEFAULT CURRENT_DATE,

  -- Body measurements
  weight numeric,
  height numeric,
  bmi numeric,
  body_fat_percentage numeric,
  lean_mass numeric,
  fat_mass numeric,

  -- Circumferences (cm)
  neck numeric,
  chest numeric,
  waist numeric,
  abdomen numeric,
  hip numeric,
  right_arm numeric,
  left_arm numeric,
  right_forearm numeric,
  left_forearm numeric,
  right_thigh numeric,
  left_thigh numeric,
  right_calf numeric,
  left_calf numeric,

  -- Skinfolds (mm) - Jackson-Pollock
  triceps_fold numeric,
  subscapular_fold numeric,
  suprailiac_fold numeric,
  abdominal_fold numeric,
  thigh_fold numeric,
  chest_fold numeric,
  midaxillary_fold numeric,

  -- Energy expenditure
  bmr numeric, -- Basal metabolic rate
  tdee numeric, -- Total daily energy expenditure
  activity_factor numeric DEFAULT 1.375,
  thermic_effect numeric, -- TEF
  neat numeric, -- Non-exercise activity thermogenesis

  -- Macros targets
  protein_target numeric,
  carbs_target numeric,
  fat_target numeric,
  calories_target numeric,

  -- Goals
  goal_weight numeric,
  goal_body_fat numeric,

  -- Notes
  notes text,
  method text DEFAULT 'jackson_pollock_7',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.physical_assessments ENABLE ROW LEVEL SECURITY;

-- Nutritionists manage assessments for their patients
CREATE POLICY "Nutritionists manage patient assessments"
ON public.physical_assessments
FOR ALL
TO authenticated
USING (
  assessor_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = physical_assessments.patient_id
    AND np.nutritionist_id = auth.uid()
    AND np.status = 'active'
  )
)
WITH CHECK (
  assessor_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = physical_assessments.patient_id
    AND np.nutritionist_id = auth.uid()
    AND np.status = 'active'
  )
);

-- Patients view own assessments
CREATE POLICY "Patients view own assessments"
ON public.physical_assessments
FOR SELECT
TO authenticated
USING (patient_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_physical_assessments_updated_at
  BEFORE UPDATE ON public.physical_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
