
-- 1. Add plan_status and audit fields to meal_plans
ALTER TABLE public.meal_plans 
  ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS template_id TEXT,
  ADD COLUMN IF NOT EXISTS template_slug TEXT,
  ADD COLUMN IF NOT EXISTS template_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS generation_source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS generated_by UUID;

-- 2. Create protocol master settings table  
CREATE TABLE IF NOT EXISTS public.protocol_master_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id UUID NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  apply_to_existing_patients BOOLEAN NOT NULL DEFAULT false,
  apply_to_new_patients BOOLEAN NOT NULL DEFAULT true,
  apply_to_programs BOOLEAN NOT NULL DEFAULT true,
  auto_generate_plan BOOLEAN NOT NULL DEFAULT true,
  require_approval BOOLEAN NOT NULL DEFAULT true,
  plan_validity_days INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(nutritionist_id)
);

-- 3. RLS for protocol_master_settings
ALTER TABLE public.protocol_master_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists manage own settings"
  ON public.protocol_master_settings
  FOR ALL
  TO authenticated
  USING (nutritionist_id = auth.uid())
  WITH CHECK (nutritionist_id = auth.uid());

-- 4. Index for plan_status
CREATE INDEX IF NOT EXISTS idx_meal_plans_plan_status ON public.meal_plans(plan_status);
CREATE INDEX IF NOT EXISTS idx_meal_plans_patient_status ON public.meal_plans(patient_id, plan_status);
