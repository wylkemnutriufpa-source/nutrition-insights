-- Drop the old constraint that points to auth.users
ALTER TABLE public.invitations
DROP CONSTRAINT IF EXISTS invitations_professional_id_fkey;

-- Add new constraint pointing to public.profiles
ALTER TABLE public.invitations
ADD CONSTRAINT invitations_professional_id_fkey
FOREIGN KEY (professional_id)
REFERENCES public.profiles(user_id)
ON DELETE CASCADE;

-- Ensure indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_professional_id ON public.invitations(professional_id);
