
-- Activity log for tracking user actions (complete and incomplete)
CREATE TABLE public.user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  route text NOT NULL,
  title text NOT NULL,
  metadata jsonb DEFAULT '{}',
  is_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own activity
CREATE POLICY "Users can read own activity"
  ON public.user_activity_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own activity"
  ON public.user_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own activity"
  ON public.user_activity_log FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Admin can see all
CREATE POLICY "Admins can read all activity"
  ON public.user_activity_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups
CREATE INDEX idx_user_activity_log_user_recent ON public.user_activity_log(user_id, created_at DESC);
CREATE INDEX idx_user_activity_log_incomplete ON public.user_activity_log(user_id, is_complete) WHERE is_complete = false;

-- RPC to log activity (upsert by action_type + route for same day)
CREATE OR REPLACE FUNCTION public.log_user_activity(
  _action_type text,
  _route text,
  _title text,
  _is_complete boolean DEFAULT false,
  _metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Upsert: if same action_type + route exists today, update it
  INSERT INTO public.user_activity_log (user_id, action_type, route, title, is_complete, metadata)
  VALUES (auth.uid(), _action_type, _route, _title, _is_complete, _metadata)
  ON CONFLICT DO NOTHING;
  
  -- Also update existing incomplete entries of same type to complete
  IF _is_complete THEN
    UPDATE public.user_activity_log
    SET is_complete = true, updated_at = now()
    WHERE user_id = auth.uid()
      AND action_type = _action_type
      AND route = _route
      AND is_complete = false
      AND created_at >= date_trunc('day', now());
  END IF;
END;
$$;

-- Table to track last session timestamp per user
CREATE TABLE public.user_sessions (
  user_id uuid PRIMARY KEY,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_resume_shown_at timestamptz,
  session_count int NOT NULL DEFAULT 1
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own session"
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can upsert own session"
  ON public.user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own session"
  ON public.user_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- RPC to update session and check if resume should show
CREATE OR REPLACE FUNCTION public.check_and_update_session()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _session record;
  _should_show boolean := false;
  _hours_away numeric;
BEGIN
  SELECT * INTO _session FROM public.user_sessions WHERE user_id = auth.uid();
  
  IF NOT FOUND THEN
    -- First time user
    INSERT INTO public.user_sessions (user_id, last_seen_at, last_resume_shown_at, session_count)
    VALUES (auth.uid(), now(), NULL, 1);
    RETURN jsonb_build_object('show_resume', false, 'first_session', true, 'hours_away', 0);
  END IF;
  
  _hours_away := EXTRACT(EPOCH FROM (now() - _session.last_seen_at)) / 3600;
  
  -- Show resume if: 4+ hours away OR first access of the day (last_seen is yesterday or before)
  IF _hours_away >= 4 OR date(_session.last_seen_at) < CURRENT_DATE THEN
    -- But don't show if we already showed today
    IF _session.last_resume_shown_at IS NULL OR date(_session.last_resume_shown_at) < CURRENT_DATE THEN
      _should_show := true;
    END IF;
  END IF;
  
  -- Update session
  UPDATE public.user_sessions
  SET last_seen_at = now(),
      session_count = session_count + 1,
      last_resume_shown_at = CASE WHEN _should_show THEN now() ELSE last_resume_shown_at END
  WHERE user_id = auth.uid();
  
  RETURN jsonb_build_object(
    'show_resume', _should_show,
    'first_session', false,
    'hours_away', round(_hours_away::numeric, 1)
  );
END;
$$;
