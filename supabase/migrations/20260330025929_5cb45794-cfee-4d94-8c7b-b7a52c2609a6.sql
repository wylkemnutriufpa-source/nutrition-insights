
-- Table to track patient meal substitutions
CREATE TABLE public.patient_meal_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  meal_plan_item_id UUID NOT NULL REFERENCES public.meal_plan_items(id) ON DELETE CASCADE,
  original_food TEXT NOT NULL,
  substituted_food TEXT NOT NULL,
  substitution_category TEXT NOT NULL,
  original_calories INTEGER,
  substituted_calories INTEGER,
  original_protein NUMERIC,
  substituted_protein NUMERIC,
  date TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_patient_meal_subs_patient ON public.patient_meal_substitutions(patient_id, meal_plan_id, date);

-- RLS
ALTER TABLE public.patient_meal_substitutions ENABLE ROW LEVEL SECURITY;

-- Patients can read/insert their own substitutions
CREATE POLICY "patients_own_subs_select" ON public.patient_meal_substitutions
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "patients_own_subs_insert" ON public.patient_meal_substitutions
  FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid());

-- Nutritionists can see substitutions for their patients via meal_plans
CREATE POLICY "nutritionist_view_subs" ON public.patient_meal_substitutions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp
      WHERE mp.id = meal_plan_id
      AND mp.nutritionist_id = auth.uid()
    )
  );

-- Enable realtime for nutritionist visibility
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_meal_substitutions;
