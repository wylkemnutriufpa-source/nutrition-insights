-- Update INSERT policy to be more resilient during the transition
DROP POLICY IF EXISTS "v3_drafts_insert_owner_bound_patient" ON public.v3_drafts;

CREATE POLICY "v3_drafts_insert_owner_bound_patient" 
ON public.v3_drafts 
FOR INSERT 
TO authenticated 
WITH CHECK (
  nutritionist_id = auth.uid()
);

-- Ensure all operations are allowed for the owner
DROP POLICY IF EXISTS "v3_drafts_select_owner_or_admin" ON public.v3_drafts;
CREATE POLICY "v3_drafts_select_owner_or_admin" 
ON public.v3_drafts 
FOR SELECT 
TO authenticated 
USING (
  nutritionist_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "v3_drafts_update_owner" ON public.v3_drafts;
CREATE POLICY "v3_drafts_update_owner" 
ON public.v3_drafts 
FOR UPDATE 
TO authenticated 
USING (nutritionist_id = auth.uid())
WITH CHECK (nutritionist_id = auth.uid());

DROP POLICY IF EXISTS "v3_drafts_delete_owner_or_admin" ON public.v3_drafts;
CREATE POLICY "v3_drafts_delete_owner_or_admin" 
ON public.v3_drafts 
FOR DELETE 
TO authenticated 
USING (nutritionist_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
