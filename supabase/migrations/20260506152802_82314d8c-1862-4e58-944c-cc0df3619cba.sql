-- Remove broad SELECT policies on public buckets to prevent listing.
-- Files remain accessible via direct/public URLs since buckets stay public.
DROP POLICY IF EXISTS "Public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view meal photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for meal visual images" ON storage.objects;
DROP POLICY IF EXISTS "shared_plans_public_read" ON storage.objects;