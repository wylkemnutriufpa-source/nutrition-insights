-- Inserir mais itens para cobrir os clusters dos templates
INSERT INTO public.v3_library_items (slug, title, meal_type, objective_tags, kcal_base, protein_base, carbs_base, fats_base, cluster_slug, category)
VALUES 
('omelete-keto', 'Omelete Keto (Bacon e Queijo)', '{breakfast, snack}', '{emagrecimento, keto}', 450, 30, 2, 35, 'cafe_proteico', 'Café da Manhã'),
('salmao-mediterraneo', 'Salmão Grelhado com Legumes', '{lunch, dinner}', '{saude, mediterranea}', 550, 40, 15, 30, 'almoco_elaborado', 'Almoço/Jantar'),
('crepioca-proteica', 'Crepioca de Frango', '{breakfast, snack}', '{hipertrofia, performance}', 400, 25, 35, 12, 'cafe_proteico', 'Café da Manhã'),
('bowl-acai-performance', 'Bowl de Açaí com Whey', '{snack}', '{performance}', 600, 30, 80, 15, 'lanche_pratico', 'Lanches'),
('sopa-leve-detox', 'Sopa de Legumes com Frango', '{dinner, supper}', '{emagrecimento, saude}', 250, 20, 25, 5, 'lanche_leve', 'Jantar'),
('mix-castanhas', 'Mix de Oleaginosas', '{snack}', '{lowcarb, keto}', 200, 5, 5, 18, 'lanche_leve', 'Lanches');

-- Associar imagens (usando imagens existentes ou placeholder se necessário)
-- Primeiro, vamos ver as imagens disponíveis
DO $$
DECLARE
    img_id UUID;
BEGIN
    SELECT id INTO img_id FROM v3_library_images LIMIT 1;
    
    IF img_id IS NOT NULL THEN
        INSERT INTO v3_library_images (item_id, image_asset, is_primary)
        SELECT id, 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=800', true FROM v3_library_items WHERE slug = 'omelete-keto';
        INSERT INTO v3_library_images (item_id, image_asset, is_primary)
        SELECT id, 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=800', true FROM v3_library_items WHERE slug = 'salmao-mediterraneo';
        INSERT INTO v3_library_images (item_id, image_asset, is_primary)
        SELECT id, 'https://images.unsplash.com/photo-1594041131908-646700390958?auto=format&fit=crop&q=80&w=800', true FROM v3_library_items WHERE slug = 'crepioca-proteica';
    END IF;
END $$;
