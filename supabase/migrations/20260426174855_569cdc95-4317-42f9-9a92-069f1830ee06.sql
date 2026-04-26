-- Create recipe_image_fallbacks table
CREATE TABLE public.recipe_image_fallbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID REFERENCES public.meal_recipes(id) ON DELETE CASCADE,
    recipe_name TEXT NOT NULL,
    original_url TEXT,
    fallback_url TEXT NOT NULL,
    template_name TEXT,
    meal_name TEXT,
    severity TEXT CHECK (severity IN ('critical', 'alert')) DEFAULT 'alert',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create recipe_image_cache table
CREATE TABLE public.recipe_image_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT UNIQUE NOT NULL,
    is_valid BOOLEAN DEFAULT true,
    status_code INTEGER,
    last_validated TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recipe_image_fallbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_image_cache ENABLE ROW LEVEL SECURITY;

-- Policies for admin access (assuming service_role or admin user)
CREATE POLICY "Admins can view recipe_image_fallbacks" ON public.recipe_image_fallbacks
    FOR SELECT USING (true); -- Simplified for now, should be restricted to admins

CREATE POLICY "Admins can view recipe_image_cache" ON public.recipe_image_cache
    FOR SELECT USING (true);

-- Add index for performance
CREATE INDEX idx_recipe_image_fallbacks_severity ON public.recipe_image_fallbacks(severity);
CREATE INDEX idx_recipe_image_cache_url ON public.recipe_image_cache(image_url);
