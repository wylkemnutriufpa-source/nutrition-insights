
-- Coach Bodybuilder v2 Schema Evolution

-- 1. Add expanded phases and composite scores to coach_athletes
ALTER TABLE public.coach_athletes 
  ADD COLUMN IF NOT EXISTS score_physical numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_adherence numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_recovery numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_performance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_risk numeric DEFAULT 0;

-- Update current_phase to support new phases
-- (column already text, just documenting new valid values: off_season, bulking, cutting, pre_contest, peak_week, reverse, maintenance)

-- 2. Add photo fields and visual observation to checkins
ALTER TABLE public.coach_athlete_checkins
  ADD COLUMN IF NOT EXISTS front_photo_url text,
  ADD COLUMN IF NOT EXISTS side_photo_url text,
  ADD COLUMN IF NOT EXISTS back_photo_url text,
  ADD COLUMN IF NOT EXISTS visual_observation text,
  ADD COLUMN IF NOT EXISTS visual_verdict text DEFAULT 'maintained';

-- 3. Create coach_alerts table
CREATE TABLE IF NOT EXISTS public.coach_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.coach_athletes(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL,
  tenant_id text,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.coach_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_alerts_owner" ON public.coach_alerts
  FOR ALL USING (coach_id = auth.uid());

-- 4. Create coach_timeline table  
CREATE TABLE IF NOT EXISTS public.coach_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.coach_athletes(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL,
  tenant_id text,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.coach_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_timeline_owner" ON public.coach_timeline
  FOR ALL USING (coach_id = auth.uid());

-- 5. Add decision reason field to coach_decisions
ALTER TABLE public.coach_decisions
  ADD COLUMN IF NOT EXISTS coach_reason text,
  ADD COLUMN IF NOT EXISTS expected_impact text;
