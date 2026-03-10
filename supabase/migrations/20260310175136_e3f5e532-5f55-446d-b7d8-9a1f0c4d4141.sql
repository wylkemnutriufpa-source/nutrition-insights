
-- =============================================
-- RANKING ARCHITECTURE HARDENING
-- =============================================

-- 1. Performance indexes on patient_points (the point ledger)
CREATE INDEX IF NOT EXISTS idx_patient_points_patient_earned 
  ON public.patient_points (patient_id, earned_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_points_action_earned 
  ON public.patient_points (patient_id, action_key, earned_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_points_earned_at 
  ON public.patient_points (earned_at DESC);

-- 2. Index on ranking_point_rules for fast lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_ranking_point_rules_action_key 
  ON public.ranking_point_rules (action_key) WHERE is_active = true;

-- 3. Cron job: refresh ranking cache every 30 minutes
SELECT cron.schedule(
  'refresh-ranking-cache-30min',
  '*/30 * * * *',
  $$SELECT public.refresh_ranking_cache()$$
);

-- 4. Nutritionists should also see their patients' points
CREATE POLICY "Nutritionists view patient points"
  ON public.patient_points
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = patient_points.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );
