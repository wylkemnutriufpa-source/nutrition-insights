-- Drop existing FK if any
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_professional_id_fkey;

-- Ensure professional_id points to profiles(user_id)
ALTER TABLE public.invitations 
ADD CONSTRAINT invitations_professional_id_fkey 
FOREIGN KEY (professional_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

-- Add comment to help postgrest if needed (though constraint should be enough)
COMMENT ON CONSTRAINT invitations_professional_id_fkey ON public.invitations IS 'Relacionamento oficial entre convite e perfil do profissional';

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';