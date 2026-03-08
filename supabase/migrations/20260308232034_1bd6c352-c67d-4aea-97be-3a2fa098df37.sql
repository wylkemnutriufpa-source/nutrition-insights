
-- 1. Create weekly_goals table
CREATE TABLE public.weekly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  target_value integer NOT NULL DEFAULT 7,
  current_value integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'vezes',
  category text NOT NULL DEFAULT 'nutrition',
  icon text NOT NULL DEFAULT '🎯',
  week_start date NOT NULL DEFAULT (date_trunc('week', CURRENT_DATE + interval '1 day') - interval '1 day')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

-- Nutritionists CRUD their own goals
CREATE POLICY "Nutritionists manage own goals"
ON public.weekly_goals FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'nutritionist') AND nutritionist_id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'nutritionist') AND nutritionist_id = auth.uid());

-- Patients view own goals
CREATE POLICY "Patients view own goals"
ON public.weekly_goals FOR SELECT TO authenticated
USING (patient_id = auth.uid());

-- Patients can increment their own goals
CREATE POLICY "Patients update own goals"
ON public.weekly_goals FOR UPDATE TO authenticated
USING (patient_id = auth.uid());

-- 2. Fix programs table missing INSERT/UPDATE/DELETE policies for nutritionists
CREATE POLICY "Nutritionists manage own programs"
ON public.programs FOR ALL TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);
