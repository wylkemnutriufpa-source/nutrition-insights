-- Add missing columns to meal_plan_templates
ALTER TABLE public.meal_plan_templates 
ADD COLUMN IF NOT EXISTS template_marmita BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS clinical_condition TEXT;

-- Update clinical rules
DELETE FROM public.meal_clinical_rules WHERE condition_name IN ('Gastrite', 'Vesícula', 'Triglicerídeos', 'Gordura no fígado', 'Diverticulite', 'Artrite', 'Lactantes');

INSERT INTO public.meal_clinical_rules (condition_name, description, restrictions, recommendations) VALUES
('Gastrite', 'Inflamação da mucosa do estômago', ARRAY['Café forte', 'Gordura excessiva', 'Pimenta', 'Frituras', 'Frutas ácidas'], ARRAY['Alimentos cozidos', 'Frutas não ácidas', 'Fracionamento das refeições']),
('Vesícula', 'Necessidade de dieta hipolipídica', ARRAY['Gorduras saturadas', 'Frituras', 'Carnes gordas', 'Laticínios integrais'], ARRAY['Carnes magras', 'Grãos integrais', 'Legumes cozidos']),
('Triglicerídeos', 'Redução de gorduras e açúcares', ARRAY['Açúcar refinado', 'Farinha branca', 'Doces', 'Bebidas alcoólicas'], ARRAY['Fibras solúveis', 'Ômega 3', 'Atividade física']),
('Gordura no fígado', 'Esteatose hepática', ARRAY['Açúcar', 'Fructose em excesso', 'Gordura trans', 'Álcool'], ARRAY['Vegetais crucíferos', 'Chá verde', 'Azeite de oliva']),
('Diverticulite', 'Inflamação nos divertículos', ARRAY['Sementes pequenas', 'Cascas duras', 'Alimentos ultraprocessados'], ARRAY['Dieta de fácil digestão', 'Hidratação aumentada']),
('Artrite', 'Processo inflamatório articular', ARRAY['Açúcar', 'Gorduras ômega-6 em excesso', 'Alimentos processados'], ARRAY['Alimentos anti-inflamatórios', 'Cúrcuma', 'Gengibre', 'Peixes gordos']),
('Lactantes', 'Aumento de demanda energética', ARRAY['Cafeína em excesso', 'Bebidas alcoólicas'], ARRAY['Aumento de ingestão hídrica', 'Aumento de 500kcal/dia', 'Proteínas de alto valor biológico']);

-- Clear existing templates
DELETE FROM public.meal_plan_templates;

-- Insert Breakfast Templates
INSERT INTO public.meal_plan_templates (name, description, category, meals, is_premium) VALUES
('Pão + Ovo (Clássico)', 'Pão integral com ovos mexidos', 'Emagrecimento', '[
  {"id": "1", "name": "Café da Manhã", "items": [
    {"id": "q2", "name": "Pão Integral", "calories": 68, "protein": 3, "carbs": 12, "fat": 1, "portionValue": 25, "portionUnit": "g", "quantity": 2},
    {"id": "q1", "name": "Ovo Cozido", "calories": 78, "protein": 6, "carbs": 0.6, "fat": 5, "portionValue": 50, "portionUnit": "unidade", "quantity": 2},
    {"id": "q11", "name": "Café Preto", "calories": 2, "protein": 0, "carbs": 0, "fat": 0, "portionValue": 100, "portionUnit": "ml", "quantity": 1}
  ]}
]', true),
('Tapioca + Queijo', 'Tapioca com queijo branco', 'Emagrecimento', '[
  {"id": "1", "name": "Café da Manhã", "items": [
    {"id": "q4", "name": "Tapioca", "calories": 70, "protein": 0, "carbs": 17, "fat": 0, "portionValue": 30, "portionUnit": "g", "quantity": 2},
    {"id": "q3", "name": "Queijo Branco", "calories": 60, "protein": 4, "carbs": 1, "fat": 4, "portionValue": 30, "portionUnit": "g", "quantity": 1},
    {"id": "q11", "name": "Café Preto", "calories": 2, "protein": 0, "carbs": 0, "fat": 0, "portionValue": 100, "portionUnit": "ml", "quantity": 1}
  ]}
]', true),
('Cuscuz + Ovo', 'Cuscuz nordestino com ovo', 'Emagrecimento', '[
  {"id": "1", "name": "Café da Manhã", "items": [
    {"id": "q5", "name": "Cuscuz", "calories": 110, "protein": 3, "carbs": 24, "fat": 0.5, "portionValue": 100, "portionUnit": "g", "quantity": 1},
    {"id": "q1", "name": "Ovo Cozido", "calories": 78, "protein": 6, "carbs": 0.6, "fat": 5, "portionValue": 50, "portionUnit": "unidade", "quantity": 2},
    {"id": "q11", "name": "Café Preto", "calories": 2, "protein": 0, "carbs": 0, "fat": 0, "portionValue": 100, "portionUnit": "ml", "quantity": 1}
  ]}
]', true);

-- Insert Snack Templates
INSERT INTO public.meal_plan_templates (name, description, category, meals, is_premium) VALUES
('Fruta (Padrão)', 'Fruta de época', 'Emagrecimento', '[
  {"id": "3", "name": "Lanche", "items": [
    {"id": "q6", "name": "Banana", "calories": 89, "protein": 1.1, "carbs": 23, "fat": 0.3, "portionValue": 100, "portionUnit": "g", "quantity": 1}
  ]}
]', true),
('Fruta + Proteína (Dia Longo)', 'Fruta com fonte de proteína', 'Emagrecimento', '[
  {"id": "3", "name": "Lanche", "items": [
    {"id": "q7", "name": "Maçã", "calories": 52, "protein": 0.3, "carbs": 14, "fat": 0.2, "portionValue": 100, "portionUnit": "g", "quantity": 1},
    {"id": "q3", "name": "Queijo Branco", "calories": 60, "protein": 4, "carbs": 1, "fat": 4, "portionValue": 30, "portionUnit": "g", "quantity": 1}
  ]}
]', true);

-- Insert Marmitas
INSERT INTO public.meal_plan_templates (name, description, category, meals, is_premium, template_marmita) VALUES
('Marmita Fit: Frango + Batata', 'Refeição congelada equilibrada', 'Marmitas', '[
  {"id": "2", "name": "Almoço", "items": [
    {"id": "m1", "name": "Marmita Frango/Batata", "calories": 450, "protein": 35, "carbs": 45, "fat": 12, "portionValue": 350, "portionUnit": "g", "quantity": 1, "isMarmita": true}
  ]}
]', true, true),
('Marmita Veggie: Lentilha + Arroz', 'Refeição vegetariana nutritiva', 'Marmitas', '[
  {"id": "2", "name": "Almoço", "items": [
    {"id": "m2", "name": "Marmita Lentilha/Arroz", "calories": 380, "protein": 22, "carbs": 55, "fat": 8, "portionValue": 350, "portionUnit": "g", "quantity": 1, "isMarmita": true}
  ]}
]', true, true);

-- Insert Clinical Templates
INSERT INTO public.meal_plan_templates (name, description, category, meals, is_premium, clinical_condition) VALUES
('Template Gastrite', 'Dieta de pouca irritação gástrica', 'Clínico', '[
  {"id": "1", "name": "Café da Manhã", "items": [
    {"id": "q2", "name": "Pão de Forma Branco", "calories": 60, "protein": 2, "carbs": 12, "fat": 0.5, "portionValue": 25, "portionUnit": "g", "quantity": 2},
    {"id": "q3", "name": "Queijo Cottage", "calories": 30, "protein": 4, "carbs": 1, "fat": 1, "portionValue": 30, "portionUnit": "g", "quantity": 1},
    {"id": "q12", "name": "Chá de Camomila", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "portionValue": 200, "portionUnit": "ml", "quantity": 1}
  ]}
]', true, 'Gastrite'),
('Template Triglicerídeos', 'Foco em fibras e redução de açúcar', 'Clínico', '[
  {"id": "1", "name": "Café da Manhã", "items": [
    {"id": "q13", "name": "Aveia em Flocos", "calories": 110, "protein": 4, "carbs": 20, "fat": 2, "portionValue": 30, "portionUnit": "g", "quantity": 1},
    {"id": "q6", "name": "Banana", "calories": 89, "protein": 1.1, "carbs": 23, "fat": 0.3, "portionValue": 100, "portionUnit": "g", "quantity": 1},
    {"id": "q14", "name": "Leite Desnatado", "calories": 35, "protein": 3.5, "carbs": 5, "fat": 0.1, "portionValue": 100, "portionUnit": "ml", "quantity": 2}
  ]}
]', true, 'Triglicerídeos');
