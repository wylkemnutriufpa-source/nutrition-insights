
-- Prestige Plans table (configurable by admin)
CREATE TABLE public.prestige_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  display_order integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#10b981',
  badge_icon text NOT NULL DEFAULT '⭐',
  badge_label text NOT NULL DEFAULT '',
  crown_enabled boolean NOT NULL DEFAULT false,
  effect_type text NOT NULL DEFAULT 'none',
  ranking_highlight boolean NOT NULL DEFAULT false,
  ai_usage_multiplier numeric NOT NULL DEFAULT 1,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  price_monthly numeric NOT NULL DEFAULT 0,
  price_quarterly numeric,
  price_semiannual numeric,
  price_annual numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prestige_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active prestige plans" ON public.prestige_plans
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins manage prestige plans" ON public.prestige_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Patient prestige assignment
CREATE TABLE public.patient_prestige (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.prestige_plans(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(patient_id)
);

ALTER TABLE public.patient_prestige ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients view own prestige" ON public.patient_prestige
  FOR SELECT TO authenticated USING (auth.uid() = patient_id);

CREATE POLICY "Nutritionists view patient prestige" ON public.patient_prestige
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = patient_prestige.patient_id
    AND np.nutritionist_id = auth.uid() AND np.status = 'active'
  ));

CREATE POLICY "Admins manage prestige" ON public.patient_prestige
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Nutritionists assign prestige" ON public.patient_prestige
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'nutritionist') AND
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = patient_prestige.patient_id
      AND np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
  );

-- Ranking points config (admin-editable)
CREATE TABLE public.ranking_point_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key text NOT NULL UNIQUE,
  action_label text NOT NULL,
  points integer NOT NULL DEFAULT 1,
  daily_limit integer,
  icon text NOT NULL DEFAULT '⚡',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ranking_point_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read point rules" ON public.ranking_point_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage point rules" ON public.ranking_point_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Patient points ledger
CREATE TABLE public.patient_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  action_key text NOT NULL,
  points integer NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  earned_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients view own points" ON public.patient_points
  FOR SELECT TO authenticated USING (auth.uid() = patient_id);

CREATE POLICY "System inserts points" ON public.patient_points
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Admins view all points" ON public.patient_points
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Patient ranking materialized view helper
CREATE TABLE public.patient_ranking_cache (
  patient_id uuid PRIMARY KEY,
  total_points integer NOT NULL DEFAULT 0,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  plan_slug text,
  plan_color text,
  crown_enabled boolean DEFAULT false,
  badge_icon text,
  rank_position integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_ranking_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view ranking" ON public.patient_ranking_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage ranking cache" ON public.patient_ranking_cache
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Privacy setting on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_in_ranking boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ranking_nickname text;

-- Seed default prestige plans
INSERT INTO public.prestige_plans (name, slug, display_order, color, badge_icon, badge_label, crown_enabled, effect_type, ranking_highlight, ai_usage_multiplier, features) VALUES
  ('Basic', 'basic', 1, '#6b7280', '⚡', 'Basic', false, 'none', false, 1, '["checklist","meals","achievements"]'::jsonb),
  ('Elite', 'elite', 2, '#3b82f6', '💎', 'Elite', false, 'glow', true, 2, '["checklist","meals","achievements","recipes","analyze_meal"]'::jsonb),
  ('Pro', 'pro', 3, '#8b5cf6', '🔥', 'Pro', false, 'shimmer', true, 3, '["checklist","meals","achievements","recipes","analyze_meal","body_analysis","autobot"]'::jsonb),
  ('Premium', 'premium', 4, '#f59e0b', '👑', 'Premium', true, 'golden', true, 5, '["checklist","meals","achievements","recipes","analyze_meal","body_analysis","autobot","clinical_copilot","reports"]'::jsonb);

-- Seed default point rules
INSERT INTO public.ranking_point_rules (action_key, action_label, points, daily_limit, icon) VALUES
  ('login', 'Login diário', 5, 1, '🔑'),
  ('checklist_complete', 'Completar checklist', 10, 1, '✅'),
  ('meal_logged', 'Registrar refeição', 5, 5, '🍽️'),
  ('feedback_sent', 'Enviar feedback', 15, 2, '💬'),
  ('program_task', 'Tarefa de programa', 10, 10, '🎯'),
  ('streak_bonus', 'Bônus de sequência', 20, 1, '🔥'),
  ('checkin_submitted', 'Check-in enviado', 25, 1, '📋'),
  ('recipe_favorited', 'Receita favoritada', 3, 5, '❤️');

-- Function to award points with daily limit check
CREATE OR REPLACE FUNCTION public.award_points(_patient_id uuid, _action_key text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rule record;
  _today_count integer;
  _new_total integer;
BEGIN
  SELECT * INTO _rule FROM public.ranking_point_rules WHERE action_key = _action_key AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'rule_not_found');
  END IF;

  IF _rule.daily_limit IS NOT NULL THEN
    SELECT count(*) INTO _today_count
    FROM public.patient_points
    WHERE patient_id = _patient_id AND action_key = _action_key
    AND earned_at >= date_trunc('day', now());

    IF _today_count >= _rule.daily_limit THEN
      RETURN jsonb_build_object('awarded', false, 'reason', 'daily_limit_reached', 'limit', _rule.daily_limit);
    END IF;
  END IF;

  INSERT INTO public.patient_points (patient_id, action_key, points, metadata)
  VALUES (_patient_id, _action_key, _rule.points, _metadata);

  SELECT COALESCE(sum(points), 0) INTO _new_total FROM public.patient_points WHERE patient_id = _patient_id;

  RETURN jsonb_build_object('awarded', true, 'points', _rule.points, 'total', _new_total);
END;
$$;

-- Function to refresh ranking cache
CREATE OR REPLACE FUNCTION public.refresh_ranking_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.patient_ranking_cache;

  INSERT INTO public.patient_ranking_cache (patient_id, total_points, display_name, avatar_url, plan_slug, plan_color, crown_enabled, badge_icon, rank_position, updated_at)
  SELECT
    pp.patient_id,
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
END;
$$;
