ALTER TABLE public.meal_visual_library ADD COLUMN nutritionist_id UUID REFERENCES auth.users(id);

CREATE POLICY "Users can insert their own visual library items" 
ON public.meal_visual_library 
FOR INSERT 
WITH CHECK (auth.uid() = nutritionist_id);

CREATE POLICY "Users can update their own visual library items" 
ON public.meal_visual_library 
FOR UPDATE 
USING (auth.uid() = nutritionist_id);

CREATE POLICY "Users can delete their own visual library items" 
ON public.meal_visual_library 
FOR DELETE 
USING (auth.uid() = nutritionist_id);