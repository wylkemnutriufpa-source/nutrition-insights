-- Create function if not exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create meal_clinical_rules table
CREATE TABLE IF NOT EXISTS public.meal_clinical_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condition_name TEXT NOT NULL,
    description TEXT,
    restrictions TEXT[] DEFAULT '{}',
    recommendations TEXT[] DEFAULT '{}',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create meal_clinical_decision_log table
CREATE TABLE IF NOT EXISTS public.meal_clinical_decision_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID,
    patient_id UUID,
    user_id UUID DEFAULT auth.uid(),
    condition_applied TEXT,
    rules_applied JSONB DEFAULT '[]',
    substitutions JSONB DEFAULT '[]',
    reasons TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.meal_clinical_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_clinical_decision_log ENABLE ROW LEVEL SECURITY;

-- Policies for meal_clinical_rules
CREATE POLICY "meal_clinical_rules_select" ON public.meal_clinical_rules 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "meal_clinical_rules_all_admin" ON public.meal_clinical_rules 
FOR ALL TO authenticated USING (true);

-- Policies for meal_clinical_decision_log
CREATE POLICY "meal_clinical_decision_log_select_own" ON public.meal_clinical_decision_log 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "meal_clinical_decision_log_insert_own" ON public.meal_clinical_decision_log 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Updated at trigger
DROP TRIGGER IF EXISTS set_meal_clinical_rules_updated_at ON public.meal_clinical_rules;
CREATE TRIGGER set_meal_clinical_rules_updated_at
BEFORE UPDATE ON public.meal_clinical_rules
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert initial data
INSERT INTO public.meal_clinical_rules (condition_name, description, restrictions, recommendations)
VALUES 
('Gastrite', 'Condição que exige evitar irritantes gástricos.', ARRAY['café forte', 'gordura excessiva', 'q8'], ARRAY['Alimentos cozidos', 'Frutas não ácidas']),
('Triglicerídeos Altos', 'Foco em redução de açúcares e carboidratos simples.', ARRAY['açúcar', 'farinha branca'], ARRAY['Fibras', 'Peixes', 'q10 integral']),
('Gordura no Fígado', 'Redução de gorduras saturadas e açúcares.', ARRAY['fritura', 'álcool', 'açúcar'], ARRAY['Vegetais verdes', 'Proteínas magras']),
('Lactantes', 'Necessidade de aporte calórico e hídrico aumentado.', ARRAY[]::text[], ARRAY['Aumento calórico', 'Hidratação', 'q8', 'q6']);
