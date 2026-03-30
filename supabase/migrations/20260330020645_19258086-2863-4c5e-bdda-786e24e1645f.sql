
-- Add gallery_images column to meal_visual_library
ALTER TABLE public.meal_visual_library ADD COLUMN IF NOT EXISTS gallery_images text[] DEFAULT '{}';

-- Create storage bucket for meal visual library images
INSERT INTO storage.buckets (id, name, public) VALUES ('meal-visual-library', 'meal-visual-library', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to meal-visual-library bucket
CREATE POLICY "Authenticated users can upload meal visual images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'meal-visual-library');

-- Allow public read access
CREATE POLICY "Public read access for meal visual images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'meal-visual-library');

-- Allow authenticated users to update/delete their uploads
CREATE POLICY "Authenticated users can manage meal visual images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'meal-visual-library');

CREATE POLICY "Authenticated users can update meal visual images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'meal-visual-library');
