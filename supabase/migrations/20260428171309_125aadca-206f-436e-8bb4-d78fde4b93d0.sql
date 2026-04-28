-- Create audit events table for high observability
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    profile_id UUID REFERENCES public.profiles(id),
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_events
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own audit events"
ON public.audit_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own audit events"
ON public.audit_events FOR SELECT
USING (auth.uid() = user_id);

-- Add persistence columns to profiles for state continuity
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_editor_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS editor_state JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS current_editor_mode TEXT DEFAULT 'V2';

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON public.audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON public.audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON public.audit_events(created_at DESC);
