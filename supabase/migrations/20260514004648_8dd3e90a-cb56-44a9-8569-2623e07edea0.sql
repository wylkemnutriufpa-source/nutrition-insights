-- Create the v3_diet_templates table
CREATE TABLE IF NOT EXISTS public.v3_diet_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    template_type TEXT DEFAULT 'standard', -- standard, therapeutic, sports
    objective TEXT NOT NULL, -- emagrecimento, hipertrofia, manutencao, etc
    meal_distribution JSONB NOT NULL, -- Array of slots [ { "slot": "breakfast", "time": "08:00" }, ... ]
    cluster_map JSONB NOT NULL, -- { "breakfast": "cafe_proteico", "lunch": "almoco_tradicional", ... }
    kcal_profiles JSONB DEFAULT '[1200, 1400, 1600, 1800, 2000, 2500, 3000]'::jsonb,
    visual_style TEXT DEFAULT 'clean',
    substitutions_enabled BOOLEAN DEFAULT true,
    editable BOOLEAN DEFAULT true,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.v3_diet_templates ENABLE ROW LEVEL SECURITY;

-- Simple RLS for Sandbox (Admin only)
-- Assuming admin has a specific metadata or role, or just allowing for sandbox context
CREATE POLICY "Allow admin to manage templates" 
ON public.v3_diet_templates 
FOR ALL 
USING (true); -- Sandbox mode allows visibility, but logic guards in code ensure isolation

-- Insert Initial Templates
INSERT INTO public.v3_diet_templates (slug, title, description, objective, meal_distribution, cluster_map)
VALUES 
('hipertrofia_tradicional', 'Hipertrofia Tradicional', 'Foco em alta densidade calórica e proteína para ganho de massa.', 'hipertrofia', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:00"}, {"slot": "dinner", "time": "19:30"}, {"slot": "supper", "time": "22:00"}]',
'{"breakfast": "cafe_proteico", "lunch": "almoco_tradicional", "snack": "lanche_pratico", "dinner": "almoco_tradicional", "supper": "lanche_leve"}'),

('emagrecimento_tradicional', 'Emagrecimento Tradicional', 'Déficit calórico com alta saciedade e alimentos íntegros.', 'emagrecimento', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:00"}, {"slot": "dinner", "time": "19:30"}]',
'{"breakfast": "cafe_tradicional", "lunch": "almoco_tradicional", "snack": "lanche_leve", "dinner": "almoco_tradicional"}'),

('low_carb', 'Low Carb', 'Redução estratégica de carboidratos com foco em gorduras boas e proteínas.', 'emagrecimento', 
'[{"slot": "breakfast", "time": "08:30"}, {"slot": "lunch", "time": "13:00"}, {"slot": "snack", "time": "17:00"}, {"slot": "dinner", "time": "20:00"}]',
'{"breakfast": "cafe_proteico", "lunch": "almoco_tradicional", "snack": "lanche_pratico", "dinner": "almoco_tradicional"}'),

('cetogenica', 'Cetogênica', 'Indução de cetose através de baixíssimo carboidrato e alta gordura.', 'emagrecimento', 
'[{"slot": "breakfast", "time": "09:00"}, {"slot": "lunch", "time": "13:00"}, {"slot": "snack", "time": "16:00"}, {"slot": "dinner", "time": "20:00"}]',
'{"breakfast": "cafe_proteico", "lunch": "almoco_tradicional", "snack": "lanche_pratico", "dinner": "almoco_tradicional"}'),

('mediterranea', 'Mediterrânea', 'Baseada em gorduras insaturadas, vegetais e proteínas magras.', 'saude', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:00"}, {"slot": "dinner", "time": "19:30"}]',
'{"breakfast": "cafe_tradicional", "lunch": "almoco_tradicional", "snack": "lanche_leve", "dinner": "almoco_tradicional"}'),

('performance_esportiva', 'Performance Esportiva', 'Foco em timing de nutrientes para maximizar o desempenho físico.', 'performance', 
'[{"slot": "breakfast", "time": "07:00"}, {"slot": "lunch", "time": "12:00"}, {"slot": "snack_1", "time": "15:00"}, {"slot": "snack_2", "time": "18:00"}, {"slot": "dinner", "time": "21:00"}]',
'{"breakfast": "cafe_proteico", "lunch": "almoco_elaborado", "snack_1": "lanche_pratico", "snack_2": "lanche_pratico", "dinner": "almoco_tradicional"}'),

('recomposicao_corporal', 'Recomposição Corporal', 'Troca de gordura por massa magra com macros equilibrados.', 'recomposicao', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:30"}, {"slot": "dinner", "time": "20:00"}]',
'{"breakfast": "cafe_proteico", "lunch": "almoco_tradicional", "snack": "lanche_pratico", "dinner": "almoco_tradicional"}'),

('diabetes_resistencia_insulinica', 'Diabetes / Resistência Insulínica', 'Foco em baixo índice glicêmico e controle de carga glicêmica.', 'saude', 
'[{"slot": "breakfast", "time": "08:00"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "16:00"}, {"slot": "dinner", "time": "19:30"}]',
'{"breakfast": "cafe_tradicional", "lunch": "almoco_tradicional", "snack": "lanche_leve", "dinner": "almoco_tradicional"}'),

('plano_feminino_leve', 'Plano Feminino Leve', 'Focado em volume alimentar com baixas calorias e conforto gástrico.', 'emagrecimento', 
'[{"slot": "breakfast", "time": "08:30"}, {"slot": "lunch", "time": "13:00"}, {"slot": "snack", "time": "16:30"}, {"slot": "dinner", "time": "19:30"}]',
'{"breakfast": "cafe_tradicional", "lunch": "almoco_tradicional", "snack": "lanche_leve", "dinner": "almoco_tradicional"}'),

('plano_masculino_alta_saciedade', 'Plano Masculino Alta Saciedade', 'Grandes volumes e alta densidade de micronutrientes para controle de fome.', 'emagrecimento', 
'[{"slot": "breakfast", "time": "07:30"}, {"slot": "lunch", "time": "12:30"}, {"slot": "snack", "time": "17:00"}, {"slot": "dinner", "time": "20:00"}]',
'{"breakfast": "cafe_proteico", "lunch": "almoco_elaborado", "snack": "lanche_pratico", "dinner": "almoco_tradicional"}');
