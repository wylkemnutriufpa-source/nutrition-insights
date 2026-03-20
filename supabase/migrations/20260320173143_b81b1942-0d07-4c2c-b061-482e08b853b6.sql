
-- 1. Create meal_plan_versions for snapshotting before changes
CREATE TABLE IF NOT EXISTS public.meal_plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  snapshot_json jsonb NOT NULL DEFAULT '{}',
  items_snapshot jsonb NOT NULL DEFAULT '[]',
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  change_reason text,
  changed_fields text[] DEFAULT '{}'
);

ALTER TABLE public.meal_plan_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists read own plan versions"
  ON public.meal_plan_versions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp
      WHERE mp.id = meal_plan_versions.meal_plan_id
        AND mp.nutritionist_id = auth.uid()
    )
  );

CREATE POLICY "Nutritionists insert own plan versions"
  ON public.meal_plan_versions FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());

CREATE INDEX idx_meal_plan_versions_plan_id ON public.meal_plan_versions(meal_plan_id);
CREATE INDEX idx_meal_plan_versions_changed_at ON public.meal_plan_versions(changed_at DESC);

-- 2. Add caloric target fields to meal_plans if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meal_plans' AND column_name = 'total_target_calories') THEN
    ALTER TABLE public.meal_plans ADD COLUMN total_target_calories numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meal_plans' AND column_name = 'total_target_protein') THEN
    ALTER TABLE public.meal_plans ADD COLUMN total_target_protein numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meal_plans' AND column_name = 'total_target_carbs') THEN
    ALTER TABLE public.meal_plans ADD COLUMN total_target_carbs numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meal_plans' AND column_name = 'total_target_fat') THEN
    ALTER TABLE public.meal_plans ADD COLUMN total_target_fat numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meal_plans' AND column_name = 'editor_version') THEN
    ALTER TABLE public.meal_plans ADD COLUMN editor_version text DEFAULT 'v2';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meal_plans' AND column_name = 'requires_regeneration') THEN
    ALTER TABLE public.meal_plans ADD COLUMN requires_regeneration boolean DEFAULT false;
  END IF;
END$$;
