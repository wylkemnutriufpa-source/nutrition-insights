
-- 1. Fix patient-documents INSERT policy to scope by nutritionist-patient link
DROP POLICY IF EXISTS "Nutritionists can upload patient documents" ON storage.objects;
CREATE POLICY "Nutritionists can upload patient documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'patient-documents'
    AND has_role(auth.uid(), 'nutritionist'::app_role)
    AND (storage.foldername(name))[1] IN (
      SELECT np.patient_id::text FROM public.nutritionist_patients np
      WHERE np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
  );

-- 2. Fix timeline_reactions SELECT policy
DROP POLICY IF EXISTS "Users can view reactions" ON public.timeline_reactions;
CREATE POLICY "Scoped read timeline reactions"
  ON public.timeline_reactions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.timeline_events te
      WHERE te.id = timeline_reactions.event_id
      AND (
        te.author_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.nutritionist_patients np
          WHERE np.nutritionist_id = auth.uid()
          AND np.patient_id = te.author_id
          AND np.status = 'active'
        )
      )
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 3. Fix timeline_poll_votes SELECT policy
DROP POLICY IF EXISTS "Users can view poll votes" ON public.timeline_poll_votes;
CREATE POLICY "Scoped read timeline poll votes"
  ON public.timeline_poll_votes FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.timeline_events te
      WHERE te.id = timeline_poll_votes.event_id
      AND (
        te.author_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.nutritionist_patients np
          WHERE np.nutritionist_id = auth.uid()
          AND np.patient_id = te.author_id
          AND np.status = 'active'
        )
      )
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );
