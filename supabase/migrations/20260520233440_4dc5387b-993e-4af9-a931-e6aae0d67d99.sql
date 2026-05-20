-- Garante que o acesso público a perfis básicos seja irrestrito para facilitar convites
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Permite leitura pública de dados básicos de perfis profissionais (clínica, especialidade)
DROP POLICY IF EXISTS "Public professional profiles are viewable by everyone" ON public.professional_profiles;
CREATE POLICY "Public professional profiles are viewable by everyone" 
ON public.professional_profiles 
FOR SELECT 
USING (true);
