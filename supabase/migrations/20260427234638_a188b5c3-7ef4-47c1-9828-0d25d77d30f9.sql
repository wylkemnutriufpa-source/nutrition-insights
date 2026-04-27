-- Update handle_new_user trigger function to handle automatic patient linkage
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role app_role := 'patient'; -- Default for invited users
  v_nutri_id UUID;
  v_tenant_id UUID;
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name);

  -- 2. Handle Role Assignment
  IF (NEW.raw_user_meta_data->>'role') = 'nutritionist' THEN
    v_role := 'nutritionist';
  ELSIF (NEW.raw_user_meta_data->>'role') = 'personal' THEN
    v_role := 'personal';
  END IF;

  -- Insert role (idempotent)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Automatic Patient Linkage (Single Source of Truth)
  -- Check if nutritionist_id is provided in the signup metadata
  v_nutri_id := (NEW.raw_user_meta_data->>'nutritionist_id')::UUID;
  
  IF v_nutri_id IS NOT NULL THEN
    -- Try to resolve tenant_id for this nutritionist
    SELECT id INTO v_tenant_id FROM public.tenants WHERE owner_id = v_nutri_id LIMIT 1;
    
    IF v_tenant_id IS NOT NULL THEN
      -- Create the linkage record if it doesn't exist
      INSERT INTO public.nutritionist_patients (
        nutritionist_id,
        patient_id,
        tenant_id,
        status,
        journey_status,
        attendance_mode
      ) VALUES (
        v_nutri_id,
        NEW.id,
        v_tenant_id,
        'active',
        'awaiting_consent',
        'online'
      )
      ON CONFLICT (nutritionist_id, patient_id) DO NOTHING;
      
      -- Optional: log linkage success for debugging
      RAISE NOTICE 'Linked patient % to nutritionist % in tenant %', NEW.id, v_nutri_id, v_tenant_id;
    ELSE
      -- Log warning if tenant not found
      RAISE WARNING 'Could not link patient %: Tenant not found for nutritionist %', NEW.id, v_nutri_id;
    END IF;
  END IF;

  -- 4. Player Stats (Gamification)
  INSERT INTO public.player_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
