-- 1. Add experience_mode column to profiles for DB persistence
ALTER TABLE public.profiles
ADD COLUMN experience_mode text DEFAULT 'basic';

-- 2. Add ownership columns to food_database for custom foods
ALTER TABLE public.food_database
ADD COLUMN IF NOT EXISTS nutritionist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false;

-- 3. Create index for custom food lookups
CREATE INDEX IF NOT EXISTS idx_food_database_nutritionist ON public.food_database(nutritionist_id) WHERE nutritionist_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_food_database_tenant ON public.food_database(tenant_id) WHERE tenant_id IS NOT NULL;

-- 4. RLS policy: allow nutritionists to insert their own custom foods
CREATE POLICY "Nutritionists can insert custom foods"
ON public.food_database FOR INSERT TO authenticated
WITH CHECK (
  nutritionist_id = auth.uid()
  AND is_custom = true
);

-- 5. RLS policy: allow nutritionists to update their own custom foods
CREATE POLICY "Nutritionists can update own custom foods"
ON public.food_database FOR UPDATE TO authenticated
USING (nutritionist_id = auth.uid() AND is_custom = true)
WITH CHECK (nutritionist_id = auth.uid() AND is_custom = true);

-- 6. RLS policy: allow nutritionists to delete their own custom foods
CREATE POLICY "Nutritionists can delete own custom foods"
ON public.food_database FOR DELETE TO authenticated
USING (nutritionist_id = auth.uid() AND is_custom = true);
