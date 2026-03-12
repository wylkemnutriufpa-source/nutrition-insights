
-- Add columns for caching display info
ALTER TABLE public.testimonials 
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID;

-- Allow anonymous users to see approved testimonials (for landing page)
CREATE POLICY "public_view_approved_testimonials"
  ON public.testimonials
  FOR SELECT
  TO anon
  USING (status = 'approved');
