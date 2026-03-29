
-- Add image_url column to meal_plan_items
ALTER TABLE public.meal_plan_items ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to saved_meals (library)
ALTER TABLE public.saved_meals ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for meal photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-photos', 'meal-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload meal photos
CREATE POLICY "Authenticated users can upload meal photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'meal-photos');

-- RLS: anyone can view meal photos (public bucket)
CREATE POLICY "Public can view meal photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'meal-photos');

-- RLS: authenticated users can update their meal photos
CREATE POLICY "Authenticated users can update meal photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'meal-photos');

-- RLS: authenticated users can delete their meal photos
CREATE POLICY "Authenticated users can delete meal photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'meal-photos');
