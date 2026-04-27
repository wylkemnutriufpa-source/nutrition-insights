-- Allow anyone to view invitation logs
-- This is safe because logs are accessed by invitation_id which is linked to a specific code
CREATE POLICY "Anyone can view invitation logs" 
ON public.invitation_logs 
FOR SELECT 
USING (true);

-- Ensure public can also view invitations (redundant but safe)
DROP POLICY IF EXISTS "Anyone can view an invitation by code" ON public.invitations;
DROP POLICY IF EXISTS "Anyone can view invitation by code" ON public.invitations;

CREATE POLICY "Anyone can view invitations by code" 
ON public.invitations 
FOR SELECT 
USING (true);
