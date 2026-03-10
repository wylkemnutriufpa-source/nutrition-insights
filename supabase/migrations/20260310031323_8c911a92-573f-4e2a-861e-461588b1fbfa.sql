
-- Create meal_item_completions table for tracking patient meal plan item completions
CREATE TABLE public.meal_item_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  meal_plan_item_id UUID NOT NULL REFERENCES public.meal_plan_items(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(patient_id, meal_plan_item_id, date)
);

-- Enable RLS
ALTER TABLE public.meal_item_completions ENABLE ROW LEVEL SECURITY;

-- Patients can manage their own completions
CREATE POLICY "Patients manage own meal completions"
  ON public.meal_item_completions
  FOR ALL
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- Nutritionists can view their patients' completions
CREATE POLICY "Nutritionists view patient meal completions"
  ON public.meal_item_completions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = meal_item_completions.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_item_completions;
