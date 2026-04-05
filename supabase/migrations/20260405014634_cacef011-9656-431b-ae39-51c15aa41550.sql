
-- 1. patient_meal_feedback: scope SELECT to own patient or linked nutritionist
DROP POLICY IF EXISTS "Nutritionists can view patient feedback" ON public.patient_meal_feedback;
CREATE POLICY "Scoped read patient meal feedback"
  ON public.patient_meal_feedback FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = patient_meal_feedback.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 2. timeline_events: scope SELECT
DROP POLICY IF EXISTS "Authenticated users can view timeline events" ON public.timeline_events;
DROP POLICY IF EXISTS "Users can view timeline events" ON public.timeline_events;
CREATE POLICY "Scoped read timeline events"
  ON public.timeline_events FOR SELECT TO authenticated
  USING (
    author_id = auth.uid()
    OR target_patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = timeline_events.target_patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 3. plan_audit_results: scope SELECT to plan owner or admin
DROP POLICY IF EXISTS "Authenticated users can view audit results" ON public.plan_audit_results;
CREATE POLICY "Scoped read plan audit results"
  ON public.plan_audit_results FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp
      WHERE mp.id = plan_audit_results.plan_id
        AND mp.nutritionist_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 4. system_error_logs: restrict NULL user_id rows to admin only
DROP POLICY IF EXISTS "Users can read own error logs" ON public.system_error_logs;
CREATE POLICY "Users can read own error logs"
  ON public.system_error_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins can read all error logs"
  ON public.system_error_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. clinical_pipeline_runs: restrict NULL nutritionist_id to admin
DROP POLICY IF EXISTS "Read own pipeline runs" ON public.clinical_pipeline_runs;
CREATE POLICY "Read own pipeline runs"
  ON public.clinical_pipeline_runs FOR SELECT TO authenticated
  USING (nutritionist_id = auth.uid());
CREATE POLICY "Admins can read all pipeline runs"
  ON public.clinical_pipeline_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 6. simulator_audit_log: restrict to admin only
DROP POLICY IF EXISTS "Authenticated users can view simulator audit" ON public.simulator_audit_log;
CREATE POLICY "Admins can view simulator audit"
  ON public.simulator_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 7. body-images bucket: add DELETE and UPDATE policies with ownership check
CREATE POLICY "Users can delete own body images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'body-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own body images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'body-images' AND (storage.foldername(name))[1] = auth.uid()::text);
