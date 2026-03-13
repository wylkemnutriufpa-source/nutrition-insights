
-- =====================================================
-- SPRINT 2.4 P2: Journey Timeline & Momentum
-- =====================================================

-- Patient Journey Events - chronological feed of transformation
CREATE TABLE public.patient_journey_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'meal_logged', 'mission_completed', 'body_assessment', 'achievement', 'checkin', 'motivation', 'streak_milestone', 'protocol_started', 'weight_change'
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📌',
  metadata JSONB DEFAULT '{}'::jsonb,
  xp_earned INTEGER DEFAULT 0,
  is_highlight BOOLEAN DEFAULT false, -- featured events
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_journey_events_patient ON patient_journey_events(patient_id, created_at DESC);
CREATE INDEX idx_journey_events_highlight ON patient_journey_events(patient_id, is_highlight) WHERE is_highlight = true;

ALTER TABLE public.patient_journey_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients see own journey" ON patient_journey_events
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Nutris see patient journey" ON patient_journey_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = patient_journey_events.patient_id
      AND np.nutritionist_id = auth.uid()
      AND np.status = 'active'
    )
  );

-- Trigger function to auto-log journey events from key actions
CREATE OR REPLACE FUNCTION public.log_journey_event_on_mission_complete()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.patient_journey_events (patient_id, event_type, title, description, icon, xp_earned, metadata)
    VALUES (
      NEW.patient_id,
      'mission_completed',
      '🎯 Missão Concluída: ' || NEW.title,
      NEW.description,
      NEW.icon,
      NEW.xp_reward,
      jsonb_build_object('mission_id', NEW.id, 'mission_type', NEW.mission_type)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_journey_mission_complete
  AFTER UPDATE ON patient_missions
  FOR EACH ROW
  EXECUTE FUNCTION log_journey_event_on_mission_complete();

-- Trigger to log journey events from checkins
CREATE OR REPLACE FUNCTION public.log_journey_event_on_checkin()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.patient_journey_events (patient_id, event_type, title, description, icon, metadata)
  VALUES (
    NEW.patient_id,
    'checkin',
    '📋 Check-in Realizado',
    CASE WHEN NEW.weight IS NOT NULL THEN 'Peso: ' || NEW.weight || ' kg' ELSE NULL END,
    '📋',
    jsonb_build_object('checkin_id', NEW.id, 'weight', NEW.weight)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_journey_checkin
  AFTER INSERT ON patient_checkins
  FOR EACH ROW
  EXECUTE FUNCTION log_journey_event_on_checkin();

-- Trigger to log journey events from meals
CREATE OR REPLACE FUNCTION public.log_journey_event_on_meal()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.patient_journey_events (patient_id, event_type, title, icon, metadata)
  VALUES (
    NEW.user_id,
    'meal_logged',
    '🍽️ ' || NEW.title,
    '🍽️',
    jsonb_build_object('meal_id', NEW.id, 'meal_type', NEW.meal_type, 'calories', NEW.calories)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_journey_meal
  AFTER INSERT ON meals
  FOR EACH ROW
  EXECUTE FUNCTION log_journey_event_on_meal();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_journey_events;
