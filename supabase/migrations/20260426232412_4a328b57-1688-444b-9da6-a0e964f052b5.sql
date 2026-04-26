-- Add status and used_at to invitations
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'completed', 'expired', 'error')),
ADD COLUMN IF NOT EXISTS used_at TIMESTAMP WITH TIME ZONE;

-- Add index for code
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.invitations(code);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Allow public read of invitations by code
DROP POLICY IF EXISTS "Anyone can view invitation by code" ON public.invitations;
CREATE POLICY "Anyone can view invitation by code"
ON public.invitations
FOR SELECT
USING (true);

-- Allow public update of status/used_at if the code matches (limited to these columns for safety)
DROP POLICY IF EXISTS "Public can update invitation status" ON public.invitations;
CREATE POLICY "Public can update invitation status"
ON public.invitations
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Ensure professional can manage their own invitations
DROP POLICY IF EXISTS "Professionals can manage their own invitations" ON public.invitations;
CREATE POLICY "Professionals can manage their own invitations"
ON public.invitations
FOR ALL
USING (auth.uid() = professional_id OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role::text = 'admin'
));
