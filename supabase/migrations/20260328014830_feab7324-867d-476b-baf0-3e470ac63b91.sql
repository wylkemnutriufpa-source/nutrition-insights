-- Enable realtime for critical tables (skip already-added ones)
DO $$
BEGIN
  -- ifj_patient_permissions
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'ifj_patient_permissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ifj_patient_permissions;
  END IF;
  
  -- chat_messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
  
  -- checklist_tasks
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'checklist_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_tasks;
  END IF;
END $$;