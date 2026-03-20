
-- Add smart notification columns for click-to-navigate
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS entity_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS entity_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_route text DEFAULT NULL;

-- Index for faster unread lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON public.notifications (user_id, is_read, created_at DESC) 
  WHERE is_read = false;

-- Backfill target_route from existing action_url where available
UPDATE public.notifications 
  SET target_route = action_url 
  WHERE action_url IS NOT NULL AND target_route IS NULL;
