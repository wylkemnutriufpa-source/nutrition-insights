-- Secure nutrition_protocols: patients should not see all protocols
DROP POLICY IF EXISTS "Authenticated users can read protocols" ON public.nutrition_protocols;

CREATE POLICY "Admins can view all protocols" 
ON public.nutrition_protocols 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Nutritionists can view protocols" 
ON public.nutrition_protocols 
FOR SELECT 
USING (has_role(auth.uid(), 'nutritionist'::app_role));

-- Ensure menu_items are also slightly better protected
DROP POLICY IF EXISTS "Anyone can read active menu items" ON public.menu_items;

CREATE POLICY "Users can read menu items based on visibility" 
ON public.menu_items 
FOR SELECT 
USING (
  is_active = true 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR (
      EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role::text = ANY(role_visibility)
      )
    )
  )
);

-- Fix menu_items visibility for some sensitive tools
UPDATE public.menu_items 
SET role_visibility = ARRAY['nutritionist', 'admin']::text[] 
WHERE route IN ('/food-database', '/planner', '/library', '/automation', '/financial', '/patients', '/diet-templates', '/clinical-intelligence', '/import-patients', '/team', '/branding');

-- Ensure ranking and appointments are also restricted if they lead to pro versions
-- but usually they have dual versions, so we keep them for now and handle in RouteGuard.
