-- Defesa em profundidade: somente admins podem alterar experience_mode_locked / unlock_date
CREATE OR REPLACE FUNCTION public.fn_guard_experience_mode_locked_writes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean := false;
  v_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  -- Service role (backend / migrations / triggers internos): permitido
  IF v_role = 'service_role' OR v_caller IS NULL THEN
    RETURN NEW;
  END IF;

  -- Detecta se houve mudança nos campos sensíveis
  IF (TG_OP = 'UPDATE'
      AND (NEW.experience_mode_locked IS DISTINCT FROM OLD.experience_mode_locked
           OR NEW.unlock_date IS DISTINCT FROM OLD.unlock_date))
     OR (TG_OP = 'INSERT'
         AND (NEW.experience_mode_locked = true OR NEW.unlock_date IS NOT NULL))
  THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = v_caller AND role = 'admin'
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar experience_mode_locked / unlock_date'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_experience_mode_locked_writes ON public.profiles;
CREATE TRIGGER trg_guard_experience_mode_locked_writes
BEFORE INSERT OR UPDATE OF experience_mode_locked, unlock_date ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.fn_guard_experience_mode_locked_writes();

-- Garante novamente que admins atuais estejam destravados
UPDATE public.profiles
SET experience_mode_locked = false,
    unlock_date = NULL
WHERE user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  AND (experience_mode_locked = true OR unlock_date IS NOT NULL);