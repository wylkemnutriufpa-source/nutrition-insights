
-- 1. Add unique constraint on ifj_priority_queue for upsert
ALTER TABLE public.ifj_priority_queue 
ADD CONSTRAINT uq_ifj_priority_owner_entity UNIQUE (owner_user_id, entity_type, entity_id);

-- 2. Add admin RLS policy on ifj_session_context (admins can read all)
CREATE POLICY "Admins read all session contexts" ON public.ifj_session_context
FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

-- 3. Add index on ifj_intent_logs for intent analytics
CREATE INDEX IF NOT EXISTS idx_ifj_intent_detected ON public.ifj_intent_logs (detected_intent, created_at DESC);

-- 4. Add index on ifj_priority_queue for level filtering
CREATE INDEX IF NOT EXISTS idx_ifj_priority_level ON public.ifj_priority_queue (priority_level, priority_score DESC) WHERE is_resolved = false;

-- 5. Add NOT NULL constraint on ifj_intent_logs essential fields
ALTER TABLE public.ifj_intent_logs ALTER COLUMN detected_intent SET DEFAULT 'unknown';
ALTER TABLE public.ifj_intent_logs ALTER COLUMN engine_used SET DEFAULT 'unknown';
