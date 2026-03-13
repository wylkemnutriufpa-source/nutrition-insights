
-- =====================================================
-- SPRINT 2.4 P0: Engagement & Adherence Engine
-- =====================================================

-- 1. Engagement Signals - detected behavioral patterns
CREATE TABLE public.engagement_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  nutritionist_id UUID NOT NULL,
  signal_type TEXT NOT NULL, -- 'checklist_drop', 'meal_drop', 'login_absence', 'score_drop', 'streak_break'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  signal_data JSONB DEFAULT '{}'::jsonb,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  detected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_engagement_signals_patient ON engagement_signals(patient_id, detected_at DESC);
CREATE INDEX idx_engagement_signals_nutri ON engagement_signals(nutritionist_id, is_resolved, severity);

ALTER TABLE public.engagement_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients see own signals" ON engagement_signals
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Nutritionists see their patients signals" ON engagement_signals
  FOR SELECT TO authenticated
  USING (nutritionist_id = auth.uid());

CREATE POLICY "System can insert signals" ON engagement_signals
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Nutritionists can update signals" ON engagement_signals
  FOR UPDATE TO authenticated
  USING (nutritionist_id = auth.uid());

-- 2. Patient Daily Adherence - daily score 0-100
CREATE TABLE public.patient_daily_adherence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  checklist_score NUMERIC(5,2) DEFAULT 0, -- 0-100
  meals_score NUMERIC(5,2) DEFAULT 0,
  plan_score NUMERIC(5,2) DEFAULT 0,
  checkin_score NUMERIC(5,2) DEFAULT 0,
  streak_score NUMERIC(5,2) DEFAULT 0,
  total_score NUMERIC(5,2) DEFAULT 0, -- weighted average
  streak_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(patient_id, date)
);

CREATE INDEX idx_daily_adherence_patient_date ON patient_daily_adherence(patient_id, date DESC);

ALTER TABLE public.patient_daily_adherence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients see own adherence" ON patient_daily_adherence
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Nutris see patient adherence" ON patient_daily_adherence
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = patient_daily_adherence.patient_id
      AND np.nutritionist_id = auth.uid()
      AND np.status = 'active'
    )
  );

CREATE POLICY "System insert adherence" ON patient_daily_adherence
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "System update adherence" ON patient_daily_adherence
  FOR UPDATE TO authenticated
  USING (true);

-- 3. Patient Missions - gamification missions
CREATE TABLE public.patient_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  nutritionist_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  mission_type TEXT NOT NULL, -- 'hydration', 'consistency', 'quality', 'tracking', 'streak'
  icon TEXT DEFAULT '🎯',
  target_value NUMERIC NOT NULL DEFAULT 1,
  current_value NUMERIC DEFAULT 0,
  xp_reward INTEGER DEFAULT 50,
  duration_hours INTEGER DEFAULT 24,
  is_global BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'expired', 'cancelled'
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_missions_patient_status ON patient_missions(patient_id, status);
CREATE INDEX idx_missions_global ON patient_missions(is_global, status) WHERE is_global = true;

ALTER TABLE public.patient_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients see own missions" ON patient_missions
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR is_global = true);

CREATE POLICY "Nutris manage missions" ON patient_missions
  FOR ALL TO authenticated
  USING (nutritionist_id = auth.uid());

CREATE POLICY "System insert missions" ON patient_missions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Patients update own missions" ON patient_missions
  FOR UPDATE TO authenticated
  USING (patient_id = auth.uid());

-- Enable realtime for engagement signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.engagement_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_missions;
