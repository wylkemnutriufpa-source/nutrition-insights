
-- Tighten INSERT policies to use service_role or validated user context
DROP POLICY IF EXISTS "System can insert signals" ON engagement_signals;
DROP POLICY IF EXISTS "System insert adherence" ON patient_daily_adherence;
DROP POLICY IF EXISTS "System update adherence" ON patient_daily_adherence;
DROP POLICY IF EXISTS "System insert missions" ON patient_missions;

-- These tables are populated by edge functions using service_role_key,
-- so no INSERT policy needed for authenticated users.
-- Patients can only update their own mission progress
DROP POLICY IF EXISTS "Patients update own missions" ON patient_missions;
CREATE POLICY "Patients update own mission progress" ON patient_missions
  FOR UPDATE TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());
