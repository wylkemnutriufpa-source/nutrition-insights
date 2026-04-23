-- Remove tenant restriction for Admins in profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (
  (user_id = auth.uid() AND tenant_id = get_user_tenant()) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (
  (user_id = auth.uid() AND tenant_id = get_user_tenant()) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Update the template "Marmitas Fixas Semanais" to use better placeholders
UPDATE public.diet_templates
SET meals = meals::jsonb || 
  jsonb_set(
    jsonb_set(
      meals::jsonb,
      '{2,foods,0,name}',
      '"Marmita Selecionada (Almoço)"'
    ),
    '{4,foods,0,name}',
    '"Marmita Selecionada (Jantar)"'
  )
WHERE name = 'Marmitas Fixas Semanais';
