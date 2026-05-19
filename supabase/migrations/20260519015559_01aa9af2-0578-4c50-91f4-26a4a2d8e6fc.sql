-- Update the 'View standard templates' policy to be more inclusive
DROP POLICY IF EXISTS "View standard templates" ON public.v3_diet_templates;

CREATE POLICY "View standard templates" 
ON public.v3_diet_templates 
FOR SELECT 
USING (active = true AND (
  template_type IN ('standard', 'premium', 'visual_v3') 
  OR nutritionist_id IS NULL
));
