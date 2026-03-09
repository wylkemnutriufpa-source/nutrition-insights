-- Função RPC para promover usuário a admin
CREATE OR REPLACE FUNCTION public.promote_to_admin(_user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Buscar user_id pelo email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = _user_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com email % não encontrado', _user_email;
  END IF;

  -- Inserir role admin (ignora se já existe)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN target_user_id;
END;
$$;

-- Promover primeiro admin: Wylkem.nutri.ufpa@gmail.com
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id 
  FROM auth.users 
  WHERE email = 'Wylkem.nutri.ufpa@gmail.com';
  
  IF admin_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;