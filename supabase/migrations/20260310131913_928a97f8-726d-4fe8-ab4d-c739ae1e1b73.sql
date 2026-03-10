-- AI usage tracking table
CREATE TABLE public.ai_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature_key text NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ai_usage_user_feature ON public.ai_usage_tracking (user_id, feature_key, used_at DESC);

CREATE POLICY "Users view own usage"
ON public.ai_usage_tracking FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own usage"
ON public.ai_usage_tracking FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all usage"
ON public.ai_usage_tracking FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- AI usage limits config table (plan-based)
CREATE TABLE public.ai_usage_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL,
  plan_tier text NOT NULL DEFAULT 'free',
  max_uses integer NOT NULL DEFAULT 1,
  period_type text NOT NULL DEFAULT 'daily',
  period_days integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feature_key, plan_tier)
);

ALTER TABLE public.ai_usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read limits"
ON public.ai_usage_limits FOR SELECT
TO authenticated
USING (true);

INSERT INTO public.ai_usage_limits (feature_key, plan_tier, max_uses, period_type, period_days) VALUES
  ('analyze_meal', 'free', 1, 'daily', 1),
  ('analyze_meal', 'pro', 3, 'daily', 1),
  ('analyze_meal', 'elite', 10, 'daily', 1),
  ('generate_recipe', 'free', 2, 'daily', 1),
  ('generate_recipe', 'pro', 5, 'daily', 1),
  ('generate_recipe', 'elite', 20, 'daily', 1),
  ('body_comparison', 'free', 1, 'monthly', 30),
  ('body_comparison', 'pro', 2, 'monthly', 30),
  ('body_comparison', 'elite', 4, 'monthly', 30);

CREATE OR REPLACE FUNCTION public.check_ai_usage(
  _user_id uuid,
  _feature_key text,
  _plan_tier text DEFAULT 'free'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _limit_record record;
  _usage_count integer;
  _cutoff timestamptz;
  _next_available timestamptz;
BEGIN
  SELECT * INTO _limit_record
  FROM public.ai_usage_limits
  WHERE feature_key = _feature_key AND plan_tier = _plan_tier;

  IF NOT FOUND THEN
    SELECT * INTO _limit_record
    FROM public.ai_usage_limits
    WHERE feature_key = _feature_key AND plan_tier = 'free';
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', true, 'used', 0, 'max_uses', 999, 'next_available', null);
  END IF;

  _cutoff := now() - (_limit_record.period_days || ' days')::interval;

  SELECT count(*) INTO _usage_count
  FROM public.ai_usage_tracking
  WHERE user_id = _user_id AND feature_key = _feature_key AND used_at > _cutoff;

  IF _usage_count >= _limit_record.max_uses THEN
    SELECT used_at + (_limit_record.period_days || ' days')::interval
    INTO _next_available
    FROM public.ai_usage_tracking
    WHERE user_id = _user_id AND feature_key = _feature_key AND used_at > _cutoff
    ORDER BY used_at ASC LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'allowed', _usage_count < _limit_record.max_uses,
    'used', _usage_count,
    'max_uses', _limit_record.max_uses,
    'period_type', _limit_record.period_type,
    'period_days', _limit_record.period_days,
    'next_available', _next_available
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_ai_usage(
  _user_id uuid,
  _feature_key text,
  _plan_tier text DEFAULT 'free'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _check jsonb;
BEGIN
  _check := public.check_ai_usage(_user_id, _feature_key, _plan_tier);
  IF NOT (_check->>'allowed')::boolean THEN
    RETURN _check;
  END IF;
  INSERT INTO public.ai_usage_tracking (user_id, feature_key) VALUES (_user_id, _feature_key);
  RETURN public.check_ai_usage(_user_id, _feature_key, _plan_tier);
END;
$$;