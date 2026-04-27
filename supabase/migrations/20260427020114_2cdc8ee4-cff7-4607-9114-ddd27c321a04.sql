-- Add public SELECT policy for profiles to allow viewing professional info during invitation
CREATE POLICY "Public can view professional info via invitation" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.invitations 
    WHERE public.invitations.professional_id = public.profiles.user_id
    AND public.invitations.status IN ('pending', 'viewed')
  )
);

-- Add public SELECT policy for tenants to allow viewing clinic name during invitation
CREATE POLICY "Public can view clinic info via invitation" 
ON public.tenants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.invitations 
    WHERE public.invitations.tenant_id = public.tenants.id
    AND public.invitations.status IN ('pending', 'viewed')
  )
);
