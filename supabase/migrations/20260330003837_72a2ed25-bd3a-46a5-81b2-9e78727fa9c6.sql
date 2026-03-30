
-- 1. Create meal_visual_library table
CREATE TABLE public.meal_visual_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  display_name text NOT NULL,
  category text NOT NULL,
  subcategory text,
  image_url text,
  image_path text,
  short_description text,
  base_recipe text,
  default_portion text,
  default_calories numeric,
  default_protein numeric,
  default_carbs numeric,
  default_fat numeric,
  tags text[] DEFAULT '{}',
  search_terms text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  tenant_id uuid REFERENCES public.tenants(id),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create meal_visual_aliases table
CREATE TABLE public.meal_visual_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_item_id uuid NOT NULL REFERENCES public.meal_visual_library(id) ON DELETE CASCADE,
  alias text NOT NULL,
  normalized_alias text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_meal_visual_library_category ON public.meal_visual_library(category);
CREATE INDEX idx_meal_visual_library_active ON public.meal_visual_library(is_active);
CREATE INDEX idx_meal_visual_library_slug ON public.meal_visual_library(slug);
CREATE INDEX idx_meal_visual_aliases_normalized ON public.meal_visual_aliases(normalized_alias);
CREATE INDEX idx_meal_visual_aliases_item ON public.meal_visual_aliases(library_item_id);

-- 4. Add visual_library_item_id to meal_plan_items
ALTER TABLE public.meal_plan_items
  ADD COLUMN visual_library_item_id uuid REFERENCES public.meal_visual_library(id);

-- 5. Add visual_library_item_id to saved_meals
ALTER TABLE public.saved_meals
  ADD COLUMN visual_library_item_id uuid REFERENCES public.meal_visual_library(id);

-- 6. RLS
ALTER TABLE public.meal_visual_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_visual_aliases ENABLE ROW LEVEL SECURITY;

-- Global items (tenant_id IS NULL) readable by all authenticated
CREATE POLICY "Authenticated users can read global visual library items"
  ON public.meal_visual_library FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id = (SELECT get_user_tenant()));

-- Nutritionists can manage their tenant items
CREATE POLICY "Nutritionists can insert visual library items"
  ON public.meal_visual_library FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_user_tenant()));

CREATE POLICY "Nutritionists can update their visual library items"
  ON public.meal_visual_library FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_user_tenant()))
  WITH CHECK (tenant_id = (SELECT get_user_tenant()));

CREATE POLICY "Nutritionists can delete their visual library items"
  ON public.meal_visual_library FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_user_tenant()));

-- Aliases follow parent item via join
CREATE POLICY "Authenticated users can read aliases"
  ON public.meal_visual_aliases FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.meal_visual_library mvl
    WHERE mvl.id = library_item_id
    AND (mvl.tenant_id IS NULL OR mvl.tenant_id = (SELECT get_user_tenant()))
  ));

CREATE POLICY "Nutritionists can manage aliases"
  ON public.meal_visual_aliases FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.meal_visual_library mvl
    WHERE mvl.id = library_item_id
    AND mvl.tenant_id = (SELECT get_user_tenant())
  ));

CREATE POLICY "Nutritionists can update aliases"
  ON public.meal_visual_aliases FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.meal_visual_library mvl
    WHERE mvl.id = library_item_id
    AND mvl.tenant_id = (SELECT get_user_tenant())
  ));

CREATE POLICY "Nutritionists can delete aliases"
  ON public.meal_visual_aliases FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.meal_visual_library mvl
    WHERE mvl.id = library_item_id
    AND mvl.tenant_id = (SELECT get_user_tenant())
  ));
