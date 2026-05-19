-- Fix column name mismatch
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'v3_diet_templates' AND column_name = 'receptionist_id') THEN
    ALTER TABLE public.v3_diet_templates RENAME COLUMN receptionist_id TO nutritionist_id;
  END IF;
END $$;

-- Ensure nutritionist_id column exists if it didn't
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'v3_diet_templates' AND column_name = 'nutritionist_id') THEN
    ALTER TABLE public.v3_diet_templates ADD COLUMN nutritionist_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.v3_diet_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policy if it exists
DROP POLICY IF EXISTS "Allow admin to manage templates" ON public.v3_diet_templates;

-- Create granular policies
-- 1. Everyone can view active standard/premium templates
CREATE POLICY "View standard templates" 
ON public.v3_diet_templates 
FOR SELECT 
USING (active = true AND (template_type = 'standard' OR template_type = 'premium' OR nutritionist_id IS NULL));

-- 2. Users can view their own custom templates
CREATE POLICY "View own templates" 
ON public.v3_diet_templates 
FOR SELECT 
USING (auth.uid() = nutritionist_id);

-- 3. Users can insert their own custom templates
CREATE POLICY "Insert own templates" 
ON public.v3_diet_templates 
FOR INSERT 
WITH CHECK (auth.uid() = nutritionist_id);

-- 4. Users can update their own custom templates
CREATE POLICY "Update own templates" 
ON public.v3_diet_templates 
FOR UPDATE 
USING (auth.uid() = nutritionist_id);

-- 5. Users can delete their own custom templates
CREATE POLICY "Delete own templates" 
ON public.v3_diet_templates 
FOR DELETE 
USING (auth.uid() = nutritionist_id);

-- 6. Full access for admins (assuming they have a metadata flag or specific email, but for now let's use a placeholder if needed)
-- For now, the above policies cover the common nutritionist use case.
