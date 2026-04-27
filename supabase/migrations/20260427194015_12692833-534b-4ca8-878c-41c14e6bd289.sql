CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role := 'patient'; -- Default for invited users
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name);

  -- 2. Handle Role Assignment
  -- Professional signups usually include the role in metadata
  IF (NEW.raw_user_meta_data->>'role') = 'nutritionist' THEN
    v_role := 'nutritionist';
  ELSIF (NEW.raw_user_meta_data->>'role') = 'personal' THEN
    v_role := 'personal';
  END IF;

  -- Insert role (idempotent)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Player Stats (Gamification)
  INSERT INTO public.player_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;