
-- FIX: Remove duplicate old policies that scanner still sees (they were created before our split)
DROP POLICY IF EXISTS "Professionals manage their enrollments" ON public.program_enrollments;
DROP POLICY IF EXISTS "Professionals manage protocol cycles" ON public.protocol_cycles;

-- FIX: player_stats — remove user UPDATE, stats managed by triggers only
DROP POLICY IF EXISTS "Users can update own stats" ON public.player_stats;

-- FIX: testimonials — hide patient_id for anonymous testimonials
DROP POLICY IF EXISTS "public_view_approved_testimonials" ON public.testimonials;

CREATE POLICY "public_view_approved_testimonials"
ON public.testimonials FOR SELECT TO anon
USING (status = 'approved' AND is_anonymous = false);

CREATE POLICY "public_view_approved_anonymous_testimonials"
ON public.testimonials FOR SELECT TO anon
USING (status = 'approved' AND is_anonymous = true);
