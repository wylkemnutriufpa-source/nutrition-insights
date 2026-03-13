
-- Add "pending" to protocol_status enum
ALTER TYPE protocol_status ADD VALUE IF NOT EXISTS 'pending' BEFORE 'active';

-- Replace the transition trigger to include pending
CREATE OR REPLACE FUNCTION public.validate_protocol_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  
  -- Final states: no transitions out
  IF OLD.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot transition from final status: %', OLD.status;
  END IF;
  
  -- pending -> active only
  IF OLD.status = 'pending' AND NEW.status NOT IN ('active', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transition from pending to %', NEW.status;
  END IF;
  
  -- active -> paused, completed, cancelled
  IF OLD.status = 'active' AND NEW.status NOT IN ('paused', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transition from active to %', NEW.status;
  END IF;
  
  -- paused -> active, completed, cancelled
  IF OLD.status = 'paused' AND NEW.status NOT IN ('active', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transition from paused to %', NEW.status;
  END IF;
  
  RETURN NEW;
END;
$function$;
