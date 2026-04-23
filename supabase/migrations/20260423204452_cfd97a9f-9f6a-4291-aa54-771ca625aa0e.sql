-- Adiciona colunas às receitas
ALTER TABLE public.meal_recipes 
ADD COLUMN IF NOT EXISTS protein_type TEXT,
ADD COLUMN IF NOT EXISTS visual_library_item_id UUID REFERENCES public.meal_visual_library(id);

-- Atualiza receitas de FRANGO
UPDATE public.meal_recipes 
SET protein_type = 'FRANGO', 
    visual_library_item_id = 'db86423f-bf3a-4eb8-b660-1d2f2dc559f6'
WHERE name IN (
    'Bobó de frango',
    'Brasileirinho de hambúrguer de frango',
    'Escondidinho de frango com macaxeira',
    'Frango com abóbora',
    'Frango desfiado com risoto de abóbora',
    'Galinhada FIT',
    'Massa com frango à marguerita',
    'Panqueca de frango'
);

-- Atualiza receitas de CARNE
UPDATE public.meal_recipes 
SET protein_type = 'CARNE', 
    visual_library_item_id = '251548b1-05af-416f-8cfd-967ba4f42d9f'
WHERE name IN (
    'Bolinhas de carne artesanal',
    'Brasileirinho de patinho',
    'Carne com legumes',
    'Escondidinho de carne com abóbora',
    'Estrogonofe de carne',
    'Massa integral à bolonhesa',
    'Panqueca de carne',
    'Risoto de carne desfiada',
    'Vaca atolada'
);

-- Atualiza receitas de PORCO
UPDATE public.meal_recipes 
SET protein_type = 'PORCO', 
    visual_library_item_id = 'a015d108-a1ad-4b84-85f0-310626246289'
WHERE name IN ('Pernil suíno');

-- Define um padrão para qualquer outra receita que não tenha sido listada
UPDATE public.meal_recipes
SET protein_type = 'FRANGO',
    visual_library_item_id = 'db86423f-bf3a-4eb8-b660-1d2f2dc559f6'
WHERE protein_type IS NULL AND meal_type IN ('almoço', 'jantar');
