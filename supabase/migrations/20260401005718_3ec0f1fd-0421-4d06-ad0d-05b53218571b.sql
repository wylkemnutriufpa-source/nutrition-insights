
-- Fix 1: checklist_daily_summary - scope SELECT
DROP POLICY IF EXISTS "authenticated_read_checklist_summary" ON public.checklist_daily_summary;
CREATE POLICY "scoped_read_checklist_summary"
  ON public.checklist_daily_summary FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = checklist_daily_summary.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Fix 2: timeline_comments - scope SELECT using author_id
DROP POLICY IF EXISTS "Users can view comments" ON public.timeline_comments;
CREATE POLICY "scoped_read_timeline_comments"
  ON public.timeline_comments FOR SELECT TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.timeline_events te
      WHERE te.id = timeline_comments.event_id
        AND (
          te.author_id = auth.uid()
          OR te.target_patient_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.nutritionist_patients np
            WHERE np.patient_id = te.target_patient_id
              AND np.nutritionist_id = auth.uid()
              AND np.status = 'active'
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
