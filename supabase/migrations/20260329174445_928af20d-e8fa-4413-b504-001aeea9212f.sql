
-- Coach Bodybuilder Module Tables

-- Athlete profiles for bodybuilding coaching
CREATE TABLE public.coach_athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  current_phase TEXT NOT NULL DEFAULT 'bulking' CHECK (current_phase IN ('cutting', 'bulking', 'peak_week', 'reverse', 'maintenance')),
  prep_score NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'evolving' CHECK (status IN ('evolving', 'stagnant', 'alert')),
  target_weight NUMERIC,
  competition_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.coach_athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_athletes_select" ON public.coach_athletes
  FOR SELECT TO authenticated
  USING (coach_id = auth.uid() OR patient_id = auth.uid());

CREATE POLICY "coach_athletes_insert" ON public.coach_athletes
  FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "coach_athletes_update" ON public.coach_athletes
  FOR UPDATE TO authenticated
  USING (coach_id = auth.uid());

CREATE POLICY "coach_athletes_delete" ON public.coach_athletes
  FOR DELETE TO authenticated
  USING (coach_id = auth.uid());

-- Athlete check-ins (subjective markers)
CREATE TABLE public.coach_athlete_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.coach_athletes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC,
  weight_avg_7d NUMERIC,
  weight_variation NUMERIC,
  adherence_pct NUMERIC,
  hunger INTEGER CHECK (hunger BETWEEN 1 AND 10),
  energy INTEGER CHECK (energy BETWEEN 1 AND 10),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 10),
  pump INTEGER CHECK (pump BETWEEN 1 AND 10),
  libido INTEGER CHECK (libido BETWEEN 1 AND 10),
  retention INTEGER CHECK (retention BETWEEN 1 AND 10),
  digestion INTEGER CHECK (digestion BETWEEN 1 AND 10),
  performance INTEGER CHECK (performance BETWEEN 1 AND 10),
  training_load NUMERIC,
  training_volume NUMERIC,
  cardio_minutes NUMERIC,
  steps INTEGER,
  notes TEXT,
  front_photo_url TEXT,
  side_photo_url TEXT,
  back_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.coach_athlete_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_checkins_select" ON public.coach_athlete_checkins
  FOR SELECT TO authenticated
  USING (coach_id = auth.uid());

CREATE POLICY "coach_checkins_insert" ON public.coach_athlete_checkins
  FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "coach_checkins_update" ON public.coach_athlete_checkins
  FOR UPDATE TO authenticated
  USING (coach_id = auth.uid());

-- Analysis results from IFJ engine
CREATE TABLE public.coach_athlete_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.coach_athletes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  plateau_detected BOOLEAN DEFAULT false,
  catabolism_risk TEXT DEFAULT 'low' CHECK (catabolism_risk IN ('low', 'moderate', 'high')),
  water_retention TEXT DEFAULT 'normal' CHECK (water_retention IN ('normal', 'mild', 'moderate', 'severe')),
  evolution_consistency TEXT DEFAULT 'consistent' CHECK (evolution_consistency IN ('consistent', 'irregular', 'declining')),
  overall_score NUMERIC DEFAULT 0,
  analysis_summary TEXT,
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.coach_athlete_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_analysis_select" ON public.coach_athlete_analysis
  FOR SELECT TO authenticated
  USING (coach_id = auth.uid());

CREATE POLICY "coach_analysis_insert" ON public.coach_athlete_analysis
  FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid());

-- Decision engine suggestions
CREATE TABLE public.coach_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.coach_athletes(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.coach_athlete_analysis(id),
  coach_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  decision_type TEXT NOT NULL CHECK (decision_type IN ('maintain_protocol', 'increase_carbs', 'reduce_carbs', 'adjust_cardio', 'review_refeed', 'increase_protein', 'reduce_volume', 'deload', 'other')),
  reason TEXT NOT NULL,
  data_basis TEXT,
  confidence_level TEXT DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'applied')),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.coach_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_decisions_select" ON public.coach_decisions
  FOR SELECT TO authenticated
  USING (coach_id = auth.uid());

CREATE POLICY "coach_decisions_insert" ON public.coach_decisions
  FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "coach_decisions_update" ON public.coach_decisions
  FOR UPDATE TO authenticated
  USING (coach_id = auth.uid());
