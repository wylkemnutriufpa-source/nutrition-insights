
-- 1. Increase daily_limit for checklist_complete from 1 to 20
UPDATE public.ranking_point_rules 
SET daily_limit = 20 
WHERE action_key = 'checklist_complete';

-- 2. Backfill points for all already-completed checklist tasks
-- Using ON CONFLICT to avoid duplicates
INSERT INTO public.patient_points (patient_id, action_key, points, metadata, source_type, source_id, earned_at)
SELECT 
  ct.patient_id,
  'checklist_complete',
  10,
  jsonb_build_object('task_id', ct.id, 'task_title', ct.title, 'category', ct.category, 'backfilled', true),
  'checklist',
  ct.id,
  COALESCE(ct.completed_at, ct.created_at)
FROM public.checklist_tasks ct
WHERE ct.completed = true
ON CONFLICT (patient_id, action_key, source_id) WHERE source_id IS NOT NULL
DO NOTHING;

-- 3. Create trigger function for automatic point awarding on task completion
CREATE OR REPLACE FUNCTION public.award_checklist_points()
RETURNS trigger AS $$
DECLARE
  _today_count integer;
  _daily_limit integer;
BEGIN
  -- Only fire when task is being completed (not uncompleted)
  IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
    -- Get daily limit
    SELECT COALESCE(daily_limit, 20) INTO _daily_limit
    FROM public.ranking_point_rules 
    WHERE action_key = 'checklist_complete' AND is_active = true;
    
    IF NOT FOUND THEN RETURN NEW; END IF;
    
    -- Check daily limit
    SELECT count(*) INTO _today_count
    FROM public.patient_points
    WHERE patient_id = NEW.patient_id 
    AND action_key = 'checklist_complete'
    AND earned_at >= date_trunc('day', now());
    
    IF _today_count < _daily_limit THEN
      INSERT INTO public.patient_points (patient_id, action_key, points, metadata, source_type, source_id)
      VALUES (
        NEW.patient_id, 
        'checklist_complete', 
        10, 
        jsonb_build_object('task_id', NEW.id, 'task_title', NEW.title, 'category', NEW.category),
        'checklist',
        NEW.id
      )
      ON CONFLICT (patient_id, action_key, source_id) WHERE source_id IS NOT NULL
      DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Create trigger on checklist_tasks
DROP TRIGGER IF EXISTS on_checklist_task_completed ON public.checklist_tasks;
CREATE TRIGGER on_checklist_task_completed
  AFTER UPDATE ON public.checklist_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.award_checklist_points();

-- 5. Refresh ranking cache with new data
SELECT public.refresh_ranking_cache();
