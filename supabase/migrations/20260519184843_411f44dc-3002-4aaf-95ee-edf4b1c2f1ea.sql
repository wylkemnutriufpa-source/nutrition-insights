
-- Alterar políticas de v3_diet_templates para permitir templates de sistema (nutritionist_id IS NULL)
DROP POLICY IF EXISTS "Admins or owners can insert templates" ON public.v3_diet_templates;
CREATE POLICY "Admins or owners can insert templates" 
ON public.v3_diet_templates 
FOR INSERT 
WITH CHECK (
  (auth.uid() = nutritionist_id) OR 
  (nutritionist_id IS NULL) OR
  (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role))
);

DROP POLICY IF EXISTS "Admins or owners can update templates" ON public.v3_diet_templates;
CREATE POLICY "Admins or owners can update templates" 
ON public.v3_diet_templates 
FOR UPDATE 
USING (
  (auth.uid() = nutritionist_id) OR 
  (nutritionist_id IS NULL) OR
  (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role))
);

DROP POLICY IF EXISTS "Admins or owners can delete templates" ON public.v3_diet_templates;
CREATE POLICY "Admins or owners can delete templates" 
ON public.v3_diet_templates 
FOR DELETE 
USING (
  (auth.uid() = nutritionist_id) OR 
  (nutritionist_id IS NULL) OR
  (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role))
);
