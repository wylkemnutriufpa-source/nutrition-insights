
-- IFJ Core Tables

-- 1. Session Context - operational memory per user session
CREATE TABLE public.ifj_session_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'patient',
  session_key text NOT NULL,
  last_patient_id uuid,
  last_patient_name text,
  last_student_id uuid,
  last_student_name text,
  last_module text,
  last_route text,
  last_intent text,
  last_entity_type text,
  last_entity_id uuid,
  context_json jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, session_key)
);

ALTER TABLE public.ifj_session_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own session context"
  ON public.ifj_session_context FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. Intent Logs - audit every IFJ interaction
CREATE TABLE public.ifj_intent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  input_text text NOT NULL,
  normalized_text text,
  detected_intent text,
  confidence numeric(4,2) DEFAULT 0,
  resolved_entity_type text,
  resolved_entity_id uuid,
  response_type text,
  engine_used text,
  response_time_ms integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ifj_intent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own intent logs"
  ON public.ifj_intent_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own intent logs"
  ON public.ifj_intent_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins read all intent logs"
  ON public.ifj_intent_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3. Priority Queue - scored entity priorities
CREATE TABLE public.ifj_priority_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  entity_name text,
  owner_user_id uuid NOT NULL,
  priority_score integer NOT NULL DEFAULT 0,
  priority_level text NOT NULL DEFAULT 'low',
  reasons_json jsonb DEFAULT '[]'::jsonb,
  source_engine text NOT NULL DEFAULT 'manual',
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ifj_priority_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own priority queue"
  ON public.ifj_priority_queue FOR ALL
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Admins manage all priorities"
  ON public.ifj_priority_queue FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_ifj_session_user ON public.ifj_session_context(user_id);
CREATE INDEX idx_ifj_intent_user_date ON public.ifj_intent_logs(user_id, created_at DESC);
CREATE INDEX idx_ifj_priority_owner ON public.ifj_priority_queue(owner_user_id, is_resolved, priority_score DESC);
CREATE INDEX idx_ifj_priority_entity ON public.ifj_priority_queue(entity_type, entity_id);
