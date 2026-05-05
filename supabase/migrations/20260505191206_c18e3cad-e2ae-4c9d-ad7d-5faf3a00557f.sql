-- Ensure proper permissions on the table
GRANT ALL ON public.v3_drafts TO authenticated;
GRANT ALL ON public.v3_drafts TO service_role;
GRANT ALL ON public.v3_drafts TO postgres;

-- Ensure sequences if any are also accessible (though using UUIDs)
-- ALTER TABLE public.v3_drafts ENABLE ROW LEVEL SECURITY; -- Already enabled
