-- Update meal_plan_templates with missing columns
ALTER TABLE public.meal_plan_templates ADD COLUMN IF NOT EXISTS target_goal TEXT;
ALTER TABLE public.meal_plan_templates ADD COLUMN IF NOT EXISTS is_lunchbox BOOLEAN DEFAULT false;

-- Clean up existing clinical templates if any to avoid duplicates
DELETE FROM public.meal_plan_templates WHERE clinical_condition IS NOT NULL OR target_goal IS NOT NULL OR is_lunchbox = true;

-- Insert Clinical Templates
INSERT INTO public.meal_plan_templates (name, description, clinical_condition, target_goal, is_premium, meals, category)
VALUES 
(
  'Protocolo Gastrite - Fase Aguda',
  'Foco em alimentos de fácil digestão, sem irritantes gástricos.',
  'Gastrite',
  'Clinical',
  true,
  '[
    {
      "name": "Café da Manhã",
      "items": [
        {"food": "Pão de forma integral", "amount": 50, "unit": "g"},
        {"food": "Ovo mexido (sem gordura)", "amount": 2, "unit": "un"},
        {"food": "Chá de hortelã ou camomila", "amount": 200, "unit": "ml"}
      ]
    },
    {
      "name": "Lanche da Manhã",
      "items": [
        {"food": "Mamão papaia", "amount": 150, "unit": "g"}
      ]
    },
    {
      "name": "Almoço",
      "items": [
        {"food": "Arroz branco", "amount": 100, "unit": "g"},
        {"food": "Frango desfiado cozido", "amount": 100, "unit": "g"},
        {"food": "Chuchu e cenoura cozidos", "amount": 100, "unit": "g"}
      ]
    }
  ]'::jsonb,
  'Clínicos'
),
(
  'Protocolo Gordura no Fígado',
  'Redução de ultraprocessados e controle de carga glicêmica.',
  'Gordura no Fígado',
  'Weight Loss',
  true,
  '[
    {
      "name": "Café da Manhã",
      "items": [
        {"food": "Pão integral", "amount": 50, "unit": "g"},
        {"food": "Queijo branco", "amount": 30, "unit": "g"},
        {"food": "Café preto (sem açúcar)", "amount": 150, "unit": "ml"}
      ]
    },
    {
      "name": "Lanche",
      "items": [
        {"food": "Abacate", "amount": 80, "unit": "g"},
        {"food": "Semente de girassol", "amount": 10, "unit": "g"}
      ]
    }
  ]'::jsonb,
  'Clínicos'
),
(
  'Protocolo Hipertrofia Limpa',
  'Superávit calórico controlado com densidade proteica elevada.',
  null,
  'Hypertrophy',
  true,
  '[
    {
      "name": "Café da Manhã",
      "items": [
        {"food": "Cuscuz de milho", "amount": 100, "unit": "g"},
        {"food": "Ovo cozido", "amount": 3, "unit": "un"},
        {"food": "Café com leite", "amount": 200, "unit": "ml"}
      ]
    },
    {
      "name": "Lanche",
      "items": [
        {"food": "Banana", "amount": 1, "unit": "un"},
        {"food": "Aveia em flocos", "amount": 30, "unit": "g"},
        {"food": "Whey Protein", "amount": 30, "unit": "g"}
      ]
    }
  ]'::jsonb,
  'Hipertrofia'
);

-- Template de Marmitas (Bloqueadas)
INSERT INTO public.meal_plan_templates (name, description, is_lunchbox, is_premium, meals, category)
VALUES 
(
  'Kit Marmitas Fit - Proteína & Fibra',
  'Refeições ultracongeladas porcionadas. Não permite edição manual.',
  true,
  true,
  '[
    {
      "name": "Almoço (Marmita)",
      "items": [{"food": "Marmita: Patinho com Legumes", "amount": 300, "unit": "g", "locked": true}]
    },
    {
      "name": "Jantar (Marmita)",
      "items": [{"food": "Marmita: Tilápia com Purê", "amount": 300, "unit": "g", "locked": true}]
    }
  ]'::jsonb,
  'Marmitas'
);
