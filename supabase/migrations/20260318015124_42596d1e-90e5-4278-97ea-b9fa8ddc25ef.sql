
-- ============================================================
-- PROTOCOL KEY ARCHITECTURE
-- Standardize active clinical protocol per patient
-- ============================================================

-- 1. Add protocol_key to protocols table (unique slug identifier)
ALTER TABLE public.protocols ADD COLUMN IF NOT EXISTS protocol_key text;
ALTER TABLE public.protocols ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;
ALTER TABLE public.protocols ADD COLUMN IF NOT EXISTS phase_config jsonb DEFAULT '{}';

-- Create unique index on protocol_key (nullable but unique when set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_protocols_protocol_key ON public.protocols (protocol_key) WHERE protocol_key IS NOT NULL;

-- 2. Seed system protocols (FitJourney Master & Biquíni Branco)
INSERT INTO public.protocols (id, title, description, category, duration_days, is_template, created_by, protocol_key, is_system, phase_config)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Protocolo FitJourney Master', 'Protocolo clínico determinístico proprietário do FitJourney. Motor de geração automática de planos, acompanhamento de adesão e ajustes baseados em dados.', 'nutrition', 90, true, '00000000-0000-0000-0000-000000000000', 'fitjourney_master', true, '{"phases": [{"key": "adaptation", "label": "Adaptação", "days": 14}, {"key": "progression", "label": "Progressão", "days": 30}, {"key": "optimization", "label": "Otimização", "days": 30}, {"key": "maintenance", "label": "Manutenção", "days": 16}]}'),
  ('00000000-0000-0000-0000-000000000002', 'Protocolo Biquíni Branco', 'Protocolo de definição corporal em 4 fases progressivas com ajustes calóricos automáticos.', 'nutrition', 120, true, '00000000-0000-0000-0000-000000000000', 'bikini_branco', true, '{"phases": [{"key": "reset", "label": "Reset", "days": 14, "deficit": 0}, {"key": "deficit", "label": "Déficit", "days": 30, "deficit": 400}, {"key": "definition", "label": "Definição", "days": 30, "deficit": 500}, {"key": "maintenance", "label": "Manutenção", "days": 46, "deficit": 0}]}')
ON CONFLICT (id) DO UPDATE SET
  protocol_key = EXCLUDED.protocol_key,
  is_system = EXCLUDED.is_system,
  phase_config = EXCLUDED.phase_config,
  title = EXCLUDED.title,
  description = EXCLUDED.description;

-- 3. Add protocol_key to patient_protocols for fast lookup
ALTER TABLE public.patient_protocols ADD COLUMN IF NOT EXISTS protocol_key text;
ALTER TABLE public.patient_protocols ADD COLUMN IF NOT EXISTS current_phase text;
ALTER TABLE public.patient_protocols ADD COLUMN IF NOT EXISTS phase_started_at timestamptz;

-- Backfill protocol_key from protocol_id
UPDATE public.patient_protocols pp
SET protocol_key = p.protocol_key
FROM public.protocols p
WHERE pp.protocol_id = p.id AND pp.protocol_key IS NULL AND p.protocol_key IS NOT NULL;

-- 4. Create protocol history table
CREATE TABLE IF NOT EXISTS public.patient_protocol_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  protocol_id uuid NOT NULL REFERENCES public.protocols(id),
  protocol_key text,
  nutritionist_id uuid,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  end_reason text, -- 'completed', 'paused', 'cancelled', 'replaced'
  changed_by uuid,
  phases_completed jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast patient lookup
CREATE INDEX IF NOT EXISTS idx_protocol_history_patient ON public.patient_protocol_history (patient_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.patient_protocol_history ENABLE ROW LEVEL SECURITY;

-- RLS: professionals see their patients' history
CREATE POLICY "Professionals see own patients protocol history" ON public.patient_protocol_history
  FOR SELECT TO authenticated
  USING (
    patient_id IN (SELECT np.patient_id FROM public.nutritionist_patients np WHERE np.nutritionist_id = auth.uid() AND np.status = 'active')
    OR nutritionist_id = auth.uid()
    OR patient_id = auth.uid()
  );

CREATE POLICY "Professionals insert protocol history" ON public.patient_protocol_history
  FOR INSERT TO authenticated
  WITH CHECK (
    nutritionist_id = auth.uid()
    OR patient_id IN (SELECT np.patient_id FROM public.nutritionist_patients np WHERE np.nutritionist_id = auth.uid() AND np.status = 'active')
  );

-- 5. Trigger: when protocol status changes, log to history
CREATE OR REPLACE FUNCTION public.log_protocol_history_on_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Only log when status changes from active to something else
  IF OLD.status = 'active' AND NEW.status != 'active' THEN
    INSERT INTO public.patient_protocol_history (patient_id, protocol_id, protocol_key, nutritionist_id, started_at, ended_at, end_reason, changed_by)
    VALUES (OLD.patient_id, OLD.protocol_id, OLD.protocol_key, OLD.nutritionist_id, OLD.start_date, now(), NEW.status, auth.uid());
  END IF;

  -- When status changes to active, also log replacement of previous
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status != 'active') THEN
    -- End any other active protocol for this patient
    UPDATE public.patient_protocols
    SET status = 'completed', updated_at = now()
    WHERE patient_id = NEW.patient_id AND id != NEW.id AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_protocol_history ON public.patient_protocols;
CREATE TRIGGER trg_log_protocol_history
  AFTER UPDATE ON public.patient_protocols
  FOR EACH ROW EXECUTE FUNCTION public.log_protocol_history_on_change();

-- 6. Trigger: auto-assign default protocol on onboarding completion
CREATE OR REPLACE FUNCTION public.auto_assign_protocol_on_onboarding()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _has_active_protocol boolean;
  _program_protocol_id uuid;
  _program_protocol_key text;
  _default_protocol_id uuid := '00000000-0000-0000-0000-000000000001'; -- fitjourney_master
  _default_protocol_key text := 'fitjourney_master';
BEGIN
  -- Only on completion
  IF NEW.status != 'completed' THEN RETURN NEW; END IF;
  IF OLD IS NOT NULL AND OLD.status = 'completed' THEN RETURN NEW; END IF;

  -- Check if patient already has an active protocol
  SELECT EXISTS(
    SELECT 1 FROM public.patient_protocols
    WHERE patient_id = NEW.patient_id AND status = 'active'
  ) INTO _has_active_protocol;

  IF _has_active_protocol THEN RETURN NEW; END IF;

  -- Check if patient is enrolled in a program with a linked protocol
  SELECT p.protocol_id, pr.protocol_key
  INTO _program_protocol_id, _program_protocol_key
  FROM public.program_enrollments pe
  JOIN public.programs p ON p.id = pe.program_id
  LEFT JOIN public.protocols pr ON pr.id = p.protocol_id
  WHERE pe.patient_id = NEW.patient_id AND pe.status = 'active' AND p.protocol_id IS NOT NULL
  LIMIT 1;

  IF _program_protocol_id IS NOT NULL THEN
    _default_protocol_id := _program_protocol_id;
    _default_protocol_key := _program_protocol_key;
  END IF;

  -- Assign protocol
  INSERT INTO public.patient_protocols (patient_id, protocol_id, protocol_key, nutritionist_id, start_date, status)
  VALUES (NEW.patient_id, _default_protocol_id, _default_protocol_key, NEW.nutritionist_id, now()::date, 'active')
  ON CONFLICT DO NOTHING;

  -- Log to timeline
  INSERT INTO public.patient_timeline (patient_id, event_type, title, description, metadata)
  VALUES (NEW.patient_id, 'protocol_assigned', 'Protocolo atribuído automaticamente',
    'Protocolo ' || COALESCE(_default_protocol_key, 'padrão') || ' atribuído ao concluir onboarding.',
    jsonb_build_object('protocol_id', _default_protocol_id, 'protocol_key', _default_protocol_key, 'source', 'onboarding_completion'));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_protocol ON public.onboarding_pipelines;
CREATE TRIGGER trg_auto_assign_protocol
  AFTER UPDATE ON public.onboarding_pipelines
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_protocol_on_onboarding();

-- 7. Helper function: get active protocol for a patient
CREATE OR REPLACE FUNCTION public.get_patient_active_protocol(_patient_id uuid)
RETURNS TABLE(protocol_id uuid, protocol_key text, protocol_title text, status text, current_phase text, start_date date, manual_intervention_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT pp.protocol_id, pp.protocol_key, p.title, pp.status, pp.current_phase, pp.start_date, pp.manual_intervention_status
  FROM public.patient_protocols pp
  JOIN public.protocols p ON p.id = pp.protocol_id
  WHERE pp.patient_id = _patient_id AND pp.status = 'active'
  ORDER BY pp.created_at DESC
  LIMIT 1;
$$;

-- 8. Realtime for protocol history
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_protocol_history;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
