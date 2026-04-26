ALTER TABLE public.recipe_image_fallbacks 
ADD COLUMN IF NOT EXISTS http_status_code INTEGER,
ADD COLUMN IF NOT EXISTS revalidated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS revalidated_status TEXT;

-- Create an index for faster querying by template_name for the chart
CREATE INDEX IF NOT EXISTS idx_recipe_image_fallbacks_template ON public.recipe_image_fallbacks(template_name);
CREATE INDEX IF NOT EXISTS idx_recipe_image_fallbacks_created_at ON public.recipe_image_fallbacks(created_at);