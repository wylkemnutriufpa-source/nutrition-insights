
-- Sprint 2.3 P1: Protocol state machine (all-in-one)
CREATE TYPE public.protocol_status AS ENUM ('active', 'paused', 'completed', 'cancelled');

-- Normalize data first
UPDATE public.patient_protocols SET status = 'active' WHERE status NOT IN ('active', 'paused', 'completed', 'cancelled');

-- Drop default, change type, re-add default
ALTER TABLE public.patient_protocols ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.patient_protocols 
  ALTER COLUMN status TYPE public.protocol_status USING status::public.protocol_status;
ALTER TABLE public.patient_protocols ALTER COLUMN status SET DEFAULT 'active'::public.protocol_status;

-- State machine trigger
CREATE OR REPLACE FUNCTION public.validate_protocol_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF OLD.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot transition from final status: %', OLD.status;
  END IF;
  IF OLD.status = 'active' AND NEW.status NOT IN ('paused', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transition from active to %', NEW.status;
  END IF;
  IF OLD.status = 'paused' AND NEW.status NOT IN ('active', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transition from paused to %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_protocol_transition
  BEFORE UPDATE ON public.patient_protocols
  FOR EACH ROW EXECUTE FUNCTION public.validate_protocol_transition();
