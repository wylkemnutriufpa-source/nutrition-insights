
-- Chat messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "Users view own messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send messages to people they're linked with
CREATE POLICY "Users send messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND (
      EXISTS (SELECT 1 FROM nutritionist_patients np WHERE np.nutritionist_id = auth.uid() AND np.patient_id = receiver_id AND np.status = 'active')
      OR EXISTS (SELECT 1 FROM nutritionist_patients np WHERE np.patient_id = auth.uid() AND np.nutritionist_id = receiver_id AND np.status = 'active')
    )
  );

-- Users can mark messages as read
CREATE POLICY "Users update own received messages" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
