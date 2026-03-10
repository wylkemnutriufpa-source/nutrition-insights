
UPDATE auth.users
SET encrypted_password = extensions.crypt('123456', extensions.gen_salt('bf')),
    updated_at = now()
WHERE id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'patient'
);
