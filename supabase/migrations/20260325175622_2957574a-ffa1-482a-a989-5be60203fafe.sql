
-- ============================================================
-- FitJourney Intelligence — Phase 1: Database Schema
-- ============================================================

-- 1. Add fit_intelligence_enabled to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fit_intelligence_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fit_intelligence_onboarded boolean NOT NULL DEFAULT false;

-- 2. Behavioral Profile (learning wizard answers)
CREATE TABLE public.behavioral_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE,
  
  -- Hydration
  water_cups_per_day integer DEFAULT 0,
  forgets_water boolean DEFAULT true,
  wake_up_time text DEFAULT '07:00',
  
  -- Workout
  workout_time text DEFAULT 'morning',
  workout_blocker text,
  trains_alone boolean DEFAULT true,
  
  -- Emotional nutrition
  weekend_diet_breaks boolean DEFAULT false,
  craving_hours text[],
  
  -- Motivation style
  motivation_style text DEFAULT 'gentle' CHECK (motivation_style IN ('gentle', 'firm')),
  message_tone text DEFAULT 'funny' CHECK (message_tone IN ('funny', 'direct')),
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.behavioral_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can read own behavioral_profile"
  ON public.behavioral_profile FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Patients can insert own behavioral_profile"
  ON public.behavioral_profile FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can update own behavioral_profile"
  ON public.behavioral_profile FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Nutritionists can read linked patient behavioral_profile"
  ON public.behavioral_profile FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = behavioral_profile.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

-- 3. Intelligence Interactions (hydration taps, reminders, responses)
CREATE TABLE public.fit_intelligence_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  interaction_type text NOT NULL CHECK (interaction_type IN ('hydration_check', 'workout_reminder', 'motivation_nudge', 'weekend_risk', 'emotional_response', 'screensaver_wake')),
  prompt_text text,
  response_value text,
  response_metadata jsonb DEFAULT '{}',
  was_dismissed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fit_intel_patient ON public.fit_intelligence_interactions(patient_id, created_at DESC);
CREATE INDEX idx_fit_intel_type ON public.fit_intelligence_interactions(patient_id, interaction_type, created_at DESC);

ALTER TABLE public.fit_intelligence_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can manage own interactions"
  ON public.fit_intelligence_interactions FOR ALL
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Nutritionists can read linked patient interactions"
  ON public.fit_intelligence_interactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = fit_intelligence_interactions.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

-- 4. Daily hydration tracking
CREATE TABLE public.fit_intelligence_hydration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  target_cups integer NOT NULL DEFAULT 8,
  consumed_cups integer NOT NULL DEFAULT 0,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, date)
);

ALTER TABLE public.fit_intelligence_hydration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can manage own hydration"
  ON public.fit_intelligence_hydration FOR ALL
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- 5. Reminder frequency learning
CREATE TABLE public.fit_intelligence_frequency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE,
  optimal_hours integer[] DEFAULT ARRAY[9, 12, 15, 18],
  ignored_count integer DEFAULT 0,
  engaged_count integer DEFAULT 0,
  cooldown_minutes integer DEFAULT 120,
  last_prompt_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fit_intelligence_frequency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can manage own frequency"
  ON public.fit_intelligence_frequency FOR ALL
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- Enable realtime for interactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.fit_intelligence_interactions;
