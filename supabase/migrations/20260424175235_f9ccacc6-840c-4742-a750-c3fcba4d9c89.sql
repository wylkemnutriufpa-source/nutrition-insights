-- Garante que admins nunca fiquem travados no modo Básico
UPDATE public.profiles
SET experience_mode_locked = false,
    unlock_date = NULL
WHERE user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin');

-- Trigger para impedir que futuros admins sejam bloqueados no modo de experiência
CREATE OR REPLACE FUNCTION public.fn_prevent_admin_experience_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o usuário é admin e alguém tentou travar o modo, ignora a trava
  IF NEW.experience_mode_locked = true
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'admin')
  THEN
    NEW.experience_mode_locked := false;
    NEW.unlock_date := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_admin_experience_lock ON public.profiles;
CREATE TRIGGER trg_prevent_admin_experience_lock
BEFORE INSERT OR UPDATE OF experience_mode_locked ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.fn_prevent_admin_experience_lock();