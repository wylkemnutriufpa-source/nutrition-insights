
-- Timeline Events table
CREATE TABLE public.timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  author_id UUID NOT NULL,
  target_patient_id UUID,
  event_type TEXT NOT NULL DEFAULT 'system_event',
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  visibility_scope TEXT NOT NULL DEFAULT 'global',
  poll_question TEXT,
  poll_options JSONB,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Timeline Reactions
CREATE TABLE public.timeline_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.timeline_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL DEFAULT '❤️',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id, emoji)
);

-- Timeline Comments
CREATE TABLE public.timeline_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.timeline_events(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Poll Votes
CREATE TABLE public.timeline_poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.timeline_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_selected INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_timeline_events_created ON public.timeline_events(created_at DESC);
CREATE INDEX idx_timeline_events_workspace ON public.timeline_events(workspace_id);
CREATE INDEX idx_timeline_events_author ON public.timeline_events(author_id);
CREATE INDEX idx_timeline_events_type ON public.timeline_events(event_type);
CREATE INDEX idx_timeline_reactions_event ON public.timeline_reactions(event_id);
CREATE INDEX idx_timeline_comments_event ON public.timeline_comments(event_id);

-- Enable RLS
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_poll_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for timeline_events
CREATE POLICY "Users can view timeline events" ON public.timeline_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create timeline events" ON public.timeline_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own events" ON public.timeline_events
  FOR UPDATE TO authenticated USING (auth.uid() = author_id);

CREATE POLICY "Authors and admins can delete events" ON public.timeline_events
  FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- RLS for reactions
CREATE POLICY "Users can view reactions" ON public.timeline_reactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can add reactions" ON public.timeline_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions" ON public.timeline_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS for comments
CREATE POLICY "Users can view comments" ON public.timeline_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can add comments" ON public.timeline_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own comments" ON public.timeline_comments
  FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- RLS for poll votes
CREATE POLICY "Users can view poll votes" ON public.timeline_poll_votes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can vote" ON public.timeline_poll_votes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.timeline_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timeline_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timeline_comments;
