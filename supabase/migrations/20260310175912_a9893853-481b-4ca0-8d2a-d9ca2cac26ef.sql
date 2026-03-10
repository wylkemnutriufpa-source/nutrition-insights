
-- =============================================
-- 1. ENHANCE POINT LEDGER (patient_points)
-- =============================================

ALTER TABLE public.patient_points
  ADD COLUMN IF NOT EXISTS professional_id uuid,
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS period_day date,
  ADD COLUMN IF NOT EXISTS period_week text,
  ADD COLUMN IF NOT EXISTS period_month text,
  ADD COLUMN IF NOT EXISTS period_year integer;

-- Backfill existing rows
UPDATE public.patient_points SET
  period_day = date(earned_at),
  period_week = to_char(earned_at, 'IYYY-IW'),
  period_month = to_char(earned_at, 'YYYY-MM'),
  period_year = extract(year from earned_at)::integer
WHERE period_day IS NULL;

-- Trigger to auto-populate period columns on insert
CREATE OR REPLACE FUNCTION public.set_point_periods()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.period_day := date(NEW.earned_at);
  NEW.period_week := to_char(NEW.earned_at, 'IYYY-IW');
  NEW.period_month := to_char(NEW.earned_at, 'YYYY-MM');
  NEW.period_year := extract(year from NEW.earned_at)::integer;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_point_periods ON public.patient_points;
CREATE TRIGGER trg_set_point_periods
  BEFORE INSERT ON public.patient_points
  FOR EACH ROW
  EXECUTE FUNCTION public.set_point_periods();

-- Anti-duplication: same patient + action + source cannot earn twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_points_source_dedup
  ON public.patient_points (patient_id, action_key, source_id)
  WHERE source_id IS NOT NULL;

-- Period indexes for fast aggregation
CREATE INDEX IF NOT EXISTS idx_patient_points_period_day
  ON public.patient_points (period_day, patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_points_period_month
  ON public.patient_points (period_month, patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_points_period_year
  ON public.patient_points (period_year, patient_id);

-- =============================================
-- 2. RANKING SNAPSHOTS (historical movement)
-- =============================================

CREATE TABLE IF NOT EXISTS public.ranking_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  period_type text NOT NULL DEFAULT 'daily',
  total_points integer NOT NULL DEFAULT 0,
  rank_position integer,
  points_checklist integer DEFAULT 0,
  points_meals integer DEFAULT 0,
  points_training integer DEFAULT 0,
  points_checkin integer DEFAULT 0,
  points_protocols integer DEFAULT 0,
  points_other integer DEFAULT 0,
  plan_slug text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, snapshot_date, period_type)
);

ALTER TABLE public.ranking_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view ranking snapshots"
  ON public.ranking_snapshots FOR SELECT TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_date_period
  ON public.ranking_snapshots (snapshot_date DESC, period_type);

CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_patient
  ON public.ranking_snapshots (patient_id, period_type, snapshot_date DESC);

-- =============================================
-- 3. UPDATE award_points() WITH SOURCE DEDUP
-- =============================================

CREATE OR REPLACE FUNCTION public.award_points(
  _patient_id uuid,
  _action_key text,
  _metadata jsonb DEFAULT '{}'::jsonb,
  _source_type text DEFAULT 'manual',
  _source_id text DEFAULT NULL,
  _professional_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _rule record;
  _today_count integer;
  _new_total integer;
  _row_count integer;
BEGIN
  -- 1. Find active rule
  SELECT * INTO _rule FROM public.ranking_point_rules 
  WHERE action_key = _action_key AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'rule_not_found');
  END IF;

  -- 2. Source deduplication
  IF _source_id IS NOT NULL THEN
    PERFORM 1 FROM public.patient_points
    WHERE patient_id = _patient_id AND action_key = _action_key AND source_id = _source_id;
    IF FOUND THEN
      RETURN jsonb_build_object('awarded', false, 'reason', 'source_already_rewarded', 'source_id', _source_id);
    END IF;
  END IF;

  -- 3. Daily limit check
  IF _rule.daily_limit IS NOT NULL THEN
    SELECT count(*) INTO _today_count
    FROM public.patient_points
    WHERE patient_id = _patient_id AND action_key = _action_key
    AND earned_at >= date_trunc('day', now());

    IF _today_count >= _rule.daily_limit THEN
      RETURN jsonb_build_object('awarded', false, 'reason', 'daily_limit_reached', 'limit', _rule.daily_limit);
    END IF;
  END IF;

  -- 4. Insert point event
  INSERT INTO public.patient_points (patient_id, action_key, points, metadata, source_type, source_id, professional_id)
  VALUES (_patient_id, _action_key, _rule.points, _metadata, _source_type, _source_id, _professional_id)
  ON CONFLICT (patient_id, action_key, source_id) WHERE source_id IS NOT NULL
  DO NOTHING;

  GET DIAGNOSTICS _row_count = ROW_COUNT;
  IF _row_count = 0 THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'duplicate_source');
  END IF;

  -- 5. Calculate new total
  SELECT COALESCE(sum(points), 0) INTO _new_total 
  FROM public.patient_points WHERE patient_id = _patient_id;

  RETURN jsonb_build_object('awarded', true, 'points', _rule.points, 'total', _new_total);
END;
$function$;

-- =============================================
-- 4. SNAPSHOT REFRESH FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.refresh_ranking_snapshots(_period_type text DEFAULT 'daily')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _since timestamptz;
  _snap_date date := CURRENT_DATE;
BEGIN
  _since := CASE
    WHEN _period_type = 'daily' THEN date_trunc('day', now())
    WHEN _period_type = 'weekly' THEN date_trunc('week', now())
    WHEN _period_type = 'monthly' THEN date_trunc('month', now())
    WHEN _period_type = 'yearly' THEN date_trunc('year', now())
    ELSE '1970-01-01'::timestamptz
  END;

  INSERT INTO public.ranking_snapshots (patient_id, snapshot_date, period_type, total_points, rank_position,
    points_checklist, points_meals, points_training, points_checkin, points_protocols, points_other, plan_slug)
  SELECT
    pp.patient_id,
    _snap_date,
    _period_type,
    COALESCE(SUM(pp.points), 0),
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(pp.points), 0) DESC),
    COALESCE(SUM(CASE WHEN pp.action_key ILIKE '%checklist%' OR pp.action_key ILIKE '%task%' THEN pp.points ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN pp.action_key ILIKE '%meal%' OR pp.action_key ILIKE '%diet%' OR pp.action_key ILIKE '%food%' THEN pp.points ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN pp.action_key ILIKE '%training%' OR pp.action_key ILIKE '%exercise%' OR pp.action_key ILIKE '%workout%' THEN pp.points ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN pp.action_key ILIKE '%checkin%' THEN pp.points ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN pp.action_key ILIKE '%protocol%' OR pp.action_key ILIKE '%program%' THEN pp.points ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN 
      pp.action_key NOT ILIKE '%checklist%' AND pp.action_key NOT ILIKE '%task%'
      AND pp.action_key NOT ILIKE '%meal%' AND pp.action_key NOT ILIKE '%diet%' AND pp.action_key NOT ILIKE '%food%'
      AND pp.action_key NOT ILIKE '%training%' AND pp.action_key NOT ILIKE '%exercise%' AND pp.action_key NOT ILIKE '%workout%'
      AND pp.action_key NOT ILIKE '%checkin%'
      AND pp.action_key NOT ILIKE '%protocol%' AND pp.action_key NOT ILIKE '%program%'
    THEN pp.points ELSE 0 END), 0),
    COALESCE(
      (SELECT ppl.slug FROM patient_prestige ppres 
       JOIN prestige_plans ppl ON ppl.id = ppres.plan_id 
       WHERE ppres.patient_id = pp.patient_id AND ppres.is_active = true LIMIT 1),
      'basic'
    )
  FROM public.patient_points pp
  WHERE pp.earned_at >= _since
  GROUP BY pp.patient_id
  HAVING SUM(pp.points) > 0
  ON CONFLICT (patient_id, snapshot_date, period_type) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    rank_position = EXCLUDED.rank_position,
    points_checklist = EXCLUDED.points_checklist,
    points_meals = EXCLUDED.points_meals,
    points_training = EXCLUDED.points_training,
    points_checkin = EXCLUDED.points_checkin,
    points_protocols = EXCLUDED.points_protocols,
    points_other = EXCLUDED.points_other,
    plan_slug = EXCLUDED.plan_slug;
END;
$function$;

-- =============================================
-- 5. UPDATE REFRESH_RANKING_CACHE to also snapshot
-- =============================================

CREATE OR REPLACE FUNCTION public.refresh_ranking_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.patient_ranking_cache;

  INSERT INTO public.patient_ranking_cache (patient_id, total_points, display_name, avatar_url, plan_slug, plan_color, crown_enabled, badge_icon, rank_position, updated_at)
  SELECT
    p.user_id AS patient_id,
    COALESCE(pts.total, 0) as total_points,
    CASE
      WHEN p.show_in_ranking = true THEN COALESCE(p.full_name, 'Paciente')
      WHEN p.ranking_nickname IS NOT NULL AND p.ranking_nickname != '' THEN p.ranking_nickname
      ELSE CONCAT(LEFT(COALESCE(p.full_name, 'P'), 1), '***')
    END as display_name,
    p.avatar_url,
    COALESCE(pp2.slug, 'basic') as plan_slug,
    COALESCE(pp2.color, '#6b7280') as plan_color,
    COALESCE(pp2.crown_enabled, false) as crown_enabled,
    COALESCE(pp2.badge_icon, '⚡') as badge_icon,
    ROW_NUMBER() OVER (ORDER BY COALESCE(pts.total, 0) DESC) as rank_position,
    now()
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'patient'
  LEFT JOIN (
    SELECT patient_id, sum(points) as total FROM public.patient_points GROUP BY patient_id
  ) pts ON pts.patient_id = p.user_id
  LEFT JOIN public.patient_prestige ppres ON ppres.patient_id = p.user_id AND ppres.is_active = true
  LEFT JOIN public.prestige_plans pp2 ON pp2.id = ppres.plan_id
  WHERE p.show_in_ranking = true OR COALESCE(pts.total, 0) > 0;

  -- Also refresh daily snapshot
  PERFORM public.refresh_ranking_snapshots('daily');
END;
$function$;

-- =============================================
-- 6. ADD MORE POINT RULES
-- =============================================

INSERT INTO public.ranking_point_rules (action_key, action_label, points, daily_limit, icon, is_active) VALUES
  ('protocol_completed', 'Protocolo concluído', 50, 1, '🏅', true),
  ('program_joined', 'Ingressou em programa', 30, 1, '🚀', true),
  ('program_phase_completed', 'Fase de programa concluída', 40, 1, '🎯', true),
  ('workout_completed', 'Treino concluído', 15, 3, '💪', true),
  ('water_goal', 'Meta de água atingida', 5, 1, '💧', true),
  ('supplement_taken', 'Suplemento tomado', 3, 5, '💊', true),
  ('weight_recorded', 'Peso registrado', 10, 1, '⚖️', true),
  ('meal_plan_followed', 'Plano alimentar seguido', 15, 6, '🥗', true)
ON CONFLICT DO NOTHING;
