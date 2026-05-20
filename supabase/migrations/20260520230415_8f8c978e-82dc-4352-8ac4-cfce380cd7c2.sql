-- Permite que qualquer pessoa (mesmo deslogada) veja nome e avatar de perfis.
-- Isso é necessário para que o paciente veja quem o convidou antes de criar a conta.
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);
