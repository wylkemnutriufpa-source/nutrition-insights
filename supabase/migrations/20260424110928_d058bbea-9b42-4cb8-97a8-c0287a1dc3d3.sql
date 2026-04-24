-- Add locking mechanism for experience mode
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS experience_mode_locked BOOLEAN DEFAULT true;

-- Update existing profiles: only patients get locked to basic if they haven't been "unlocked" yet
-- This assumes patients are already marked with 'patient' role in user_roles
UPDATE public.profiles 
SET experience_mode = 'basic', experience_mode_locked = true
WHERE user_id IN (
    SELECT user_id FROM public.user_roles WHERE role = 'patient'
) AND experience_mode IS NULL;

-- Function to prevent unauthorized mode changes
CREATE OR REPLACE FUNCTION public.check_experience_mode_lock()
RETURNS TRIGGER AS $$
BEGIN
    -- If locked and attempting to change mode to something other than basic
    IF OLD.experience_mode_locked = true AND NEW.experience_mode != 'basic' AND OLD.experience_mode = 'basic' THEN
        -- Only allow the change if the professional/admin explicitly unlocks it 
        -- or if some business logic condition is met. 
        -- For now, we just enforce the lock if experience_mode_locked is true.
        RAISE EXCEPTION 'O modo de experiência está bloqueado no nível Básico para este perfil.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_experience_mode_lock ON public.profiles;
CREATE TRIGGER tr_experience_mode_lock
BEFORE UPDATE OF experience_mode ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_experience_mode_lock();
