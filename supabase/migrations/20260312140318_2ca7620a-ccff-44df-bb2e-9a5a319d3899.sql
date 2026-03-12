
-- Planner events table
CREATE TABLE public.planner_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'reminder',
  event_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT false,
  color TEXT,
  created_by UUID NOT NULL,
  target_user_id UUID,
  patient_id UUID,
  nutritionist_id UUID,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.planner_events ENABLE ROW LEVEL SECURITY;

-- Users can see events they created or that target them
CREATE POLICY "Users see own events" ON public.planner_events
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR target_user_id = auth.uid());

-- Users can insert their own events
CREATE POLICY "Users insert own events" ON public.planner_events
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Users can update events they created
CREATE POLICY "Users update own events" ON public.planner_events
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- Users can delete events they created
CREATE POLICY "Users delete own events" ON public.planner_events
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Nutritionists can see events they created for patients
CREATE POLICY "Nutritionists see patient events" ON public.planner_events
  FOR SELECT TO authenticated
  USING (nutritionist_id = auth.uid());

-- Index for performance
CREATE INDEX idx_planner_events_created_by ON public.planner_events(created_by);
CREATE INDEX idx_planner_events_target_user ON public.planner_events(target_user_id);
CREATE INDEX idx_planner_events_date ON public.planner_events(event_date);
CREATE INDEX idx_planner_events_nutritionist ON public.planner_events(nutritionist_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.planner_events;
