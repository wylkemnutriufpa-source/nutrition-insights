
-- Program timeline for program-level events
CREATE TABLE public.program_timeline (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'note',
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.program_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists manage program timeline"
ON public.program_timeline FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM programs p WHERE p.id = program_timeline.program_id AND p.created_by = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM programs p WHERE p.id = program_timeline.program_id AND p.created_by = auth.uid()));

-- Add unique constraint on checklist_tasks to support ON CONFLICT in sync function
-- Check if it exists first via a DO block
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'checklist_tasks_patient_task_date_unique'
  ) THEN
    ALTER TABLE public.checklist_tasks ADD CONSTRAINT checklist_tasks_patient_task_date_unique UNIQUE (patient_id, protocol_task_id, date);
  END IF;
END$$;

-- Enable realtime for program_timeline
ALTER PUBLICATION supabase_realtime ADD TABLE public.program_timeline;
