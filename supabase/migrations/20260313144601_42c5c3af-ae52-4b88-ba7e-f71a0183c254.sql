
-- ============================================================
-- FIX 4: patient_points — remove patient INSERT policy (points are awarded by triggers/RPC only)
-- ============================================================

DROP POLICY IF EXISTS "System inserts points" ON public.patient_points;

-- ============================================================
-- FIX 5: user_achievements — remove patient INSERT policy (achievements should be validated server-side)
-- ============================================================

DROP POLICY IF EXISTS "Users can earn achievements" ON public.user_achievements;

-- ============================================================
-- FIX 6: patient_missions — restrict patient UPDATE to progress columns only
-- ============================================================

DROP POLICY IF EXISTS "Patients update own mission progress" ON public.patient_missions;

-- Patients can only update current_value (progress) on their own missions
CREATE POLICY "Patients update own mission progress"
ON public.patient_missions FOR UPDATE TO authenticated
USING (patient_id = auth.uid())
WITH CHECK (patient_id = auth.uid());

-- Create a trigger to prevent patients from modifying protected columns
CREATE OR REPLACE FUNCTION public.protect_mission_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If the user is a patient (not nutritionist/admin), block changes to sensitive fields
  IF NOT has_role(auth.uid(), 'nutritionist'::app_role) 
     AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    -- Preserve protected fields
    NEW.xp_reward := OLD.xp_reward;
    NEW.target_value := OLD.target_value;
    NEW.title := OLD.title;
    NEW.description := OLD.description;
    NEW.mission_type := OLD.mission_type;
    NEW.icon := OLD.icon;
    NEW.nutritionist_id := OLD.nutritionist_id;
    NEW.patient_id := OLD.patient_id;
    NEW.is_global := OLD.is_global;
    
    -- Auto-complete: if current_value >= target_value, set status
    IF NEW.current_value >= OLD.target_value AND OLD.status != 'completed' THEN
      NEW.status := 'completed';
    ELSIF NEW.current_value < OLD.target_value THEN
      NEW.status := OLD.status;
      -- Don't allow patient to manually set completed
      IF NEW.status = 'completed' THEN
        NEW.status := 'active';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_mission_fields_trigger ON public.patient_missions;
CREATE TRIGGER protect_mission_fields_trigger
  BEFORE UPDATE ON public.patient_missions
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_mission_fields();
