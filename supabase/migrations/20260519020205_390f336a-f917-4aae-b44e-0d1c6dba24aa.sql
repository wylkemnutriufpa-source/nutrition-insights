-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Insert own templates" ON public.v3_diet_templates;
DROP POLICY IF EXISTS "Update own templates" ON public.v3_diet_templates;
DROP POLICY IF EXISTS "Delete own templates" ON public.v3_diet_templates;

-- Create more inclusive policies
CREATE POLICY "Admins or owners can insert templates" 
ON public.v3_diet_templates 
FOR INSERT 
WITH CHECK (
  auth.uid() = nutritionist_id OR 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins or owners can update templates" 
ON public.v3_diet_templates 
FOR UPDATE 
USING (
  auth.uid() = nutritionist_id OR 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins or owners can delete templates" 
ON public.v3_diet_templates 
FOR DELETE 
USING (
  auth.uid() = nutritionist_id OR 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
