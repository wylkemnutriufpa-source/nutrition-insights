
-- =====================================================
-- LIFECYCLE INTEGRITY REPAIR MIGRATION
-- =====================================================

-- 1) Create repair log table
CREATE TABLE IF NOT EXISTS public.lifecycle_repair_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_type text NOT NULL,
  entity_table text NOT NULL,
  entity_id uuid NOT NULL,
  previous_state jsonb NOT NULL DEFAULT '{}',
  new_state jsonb NOT NULL DEFAULT '{}',
  repaired_at timestamptz NOT NULL DEFAULT now(),
  repair_reason text
);

-- 2) Fix dual-state meal plan: draft_auto_generated but is_active=true
-- Plan a084445f has is_active=true but plan_status=draft_auto_generated
-- while patient already has a published plan (9eb750d3)
-- → Deactivate the draft plan

-- Log the repair
INSERT INTO public.lifecycle_repair_logs (repair_type, entity_table, entity_id, previous_state, new_state, repair_reason)
VALUES (
  'dual_state_deactivation',
  'meal_plans',
  'a084445f-6a73-4802-be26-552a5f58876c',
  '{"is_active": true, "plan_status": "draft_auto_generated"}'::jsonb,
  '{"is_active": false, "plan_status": "draft_auto_generated"}'::jsonb,
  'Patient e37dfb2c has 2 active plans. Deactivating draft while published plan exists.'
);

-- Apply the fix
UPDATE public.meal_plans
SET is_active = false
WHERE id = 'a084445f-6a73-4802-be26-552a5f58876c';

-- 3) Archive orphan pipelines without nutritionist linkage
-- Pipelines where nutritionist_id is NULL and status is stuck
INSERT INTO public.lifecycle_repair_logs (repair_type, entity_table, entity_id, previous_state, new_state, repair_reason)
SELECT
  'orphan_pipeline_archived',
  'onboarding_pipelines',
  op.id,
  jsonb_build_object('status', op.status, 'nutritionist_id', null),
  jsonb_build_object('status', 'archived', 'nutritionist_id', null),
  'Orphan pipeline: no active nutritionist linkage found for patient ' || op.patient_id
FROM onboarding_pipelines op
LEFT JOIN nutritionist_patients np ON np.patient_id = op.patient_id AND np.status = 'active'
WHERE np.nutritionist_id IS NULL
  AND op.status NOT IN ('completed', 'cancelled', 'archived', 'superseded_by_published_plan', 'superseded_by_active_plan');

UPDATE public.onboarding_pipelines op
SET status = 'archived'
FROM (
  SELECT op2.id
  FROM onboarding_pipelines op2
  LEFT JOIN nutritionist_patients np ON np.patient_id = op2.patient_id AND np.status = 'active'
  WHERE np.nutritionist_id IS NULL
    AND op2.status NOT IN ('completed', 'cancelled', 'archived', 'superseded_by_published_plan', 'superseded_by_active_plan')
) orphans
WHERE op.id = orphans.id;

-- 4) Add a database constraint to prevent future dual-active plans
-- Create a partial unique index: only one is_active=true per patient
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_plan_per_patient
ON public.meal_plans (patient_id)
WHERE is_active = true;
