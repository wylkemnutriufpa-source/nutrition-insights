
-- Replace permissive insert policy with one that validates required fields
DROP POLICY "Anyone can submit lead requests" ON public.lead_requests;
CREATE POLICY "Anyone can submit lead requests with valid data"
  ON public.lead_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(name) > 0 AND length(name) <= 200
    AND length(email) > 2 AND length(email) <= 320
    AND length(coalesce(message, '')) <= 2000
  );
