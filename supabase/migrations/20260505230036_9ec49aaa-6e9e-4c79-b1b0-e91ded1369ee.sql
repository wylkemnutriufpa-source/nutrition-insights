-- Create table for experience configuration
CREATE TABLE IF NOT EXISTS public.experience_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL CHECK (role IN ('patient', 'nutritionist', 'personal', 'admin')),
    mode TEXT NOT NULL CHECK (mode IN ('basic', 'pro', 'advanced')),
    feature_key TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    ui_component_id TEXT, -- Optional, if specific UI sections should be toggled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(role, mode, feature_key)
);

-- Enable RLS
ALTER TABLE public.experience_configurations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage experience configurations" 
ON public.experience_configurations 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can read experience configurations" 
ON public.experience_configurations 
FOR SELECT 
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_experience_configurations_updated_at
BEFORE UPDATE ON public.experience_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data for Patient Basic Mode (Simplified as requested)
-- We only want: diet (plan), feedback, recipes.
INSERT INTO public.experience_configurations (role, mode, feature_key, is_enabled) VALUES
('patient', 'basic', 'diet', true),
('patient', 'basic', 'feedback', true),
('patient', 'basic', 'recipes', true),
('patient', 'basic', 'checklist', false),
('patient', 'basic', 'water-calculator', false),
('patient', 'basic', 'weight-calculator', false),
('patient', 'basic', 'anamnesis', false),
('patient', 'basic', 'journey', false),
('patient', 'basic', 'achievements', false),
('patient', 'basic', 'challenges', false),
('patient', 'basic', 'tips', false),
('patient', 'basic', 'ai-insights', false),
('patient', 'basic', 'momentum', false)
ON CONFLICT (role, mode, feature_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
