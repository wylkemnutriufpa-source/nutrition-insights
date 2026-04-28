-- Create meal_plan_templates table
CREATE TABLE IF NOT EXISTS public.meal_plan_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    meals JSONB NOT NULL DEFAULT '[]',
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create meal_plan_favorites table
CREATE TABLE IF NOT EXISTS public.meal_plan_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'meal' or 'full_plan'
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.meal_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_favorites ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Templates viewable by everyone" ON public.meal_plan_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage their favorites" ON public.meal_plan_favorites FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Insert premium templates
INSERT INTO public.meal_plan_templates (name, category, description, is_premium, meals)
VALUES 
('Low Carb Express', 'Low Carb', 'Focado em proteínas magras e gorduras boas.', true, '[{"id": "1", "name": "Café", "items": []}]'),
('Hipertrofia Elite', 'Hipertrofia', 'Máximo aporte proteico para ganho de massa.', true, '[{"id": "1", "name": "Café", "items": []}]'),
('Detox Clínico', 'Clínico', 'Indicado para limpeza metabólica inicial.', false, '[{"id": "1", "name": "Café", "items": []}]');
