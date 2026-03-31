
-- Insert new visual library items
INSERT INTO public.meal_visual_library (slug, name, display_name, category, image_url, image_path, short_description, tags, search_terms, is_active, sort_order, gallery_images)
VALUES
  ('wrap-integral', 'Wrap Integral', 'Wrap Integral', 'lanche', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/wrap-integral.jpg', 'wrap-integral.jpg', 'Wrap integral recheado', ARRAY['wrap','integral','lanche','fibras','rap10'], ARRAY['wrap','rap10','wrap integral','tortilha'], true, 200, ARRAY[]::text[]),
  ('banana-com-pasta-de-amendoim', 'Banana com Pasta de Amendoim', 'Banana com Pasta de Amendoim', 'lanche', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-pasta-de-amendoim.jpg', 'banana-com-pasta-de-amendoim.jpg', 'Banana fatiada com pasta de amendoim', ARRAY['banana','pasta de amendoim','lanche','proteina'], ARRAY['banana com pasta de amendoim','banana amendoim'], true, 201, ARRAY[]::text[]),
  ('abacate', 'Abacate', 'Abacate', 'lanche', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/abacate.jpg', 'abacate.jpg', 'Abacate fresco', ARRAY['abacate','fruta','gordura boa'], ARRAY['abacate','avocado'], true, 202, ARRAY[]::text[]),
  ('gelatina', 'Gelatina', 'Gelatina', 'lanche', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/gelatina.jpg', 'gelatina.jpg', 'Gelatina diet/zero', ARRAY['gelatina','sobremesa','lanche','diet'], ARRAY['gelatina','gelatina diet','gelatina zero'], true, 203, ARRAY[]::text[]),
  ('azeite', 'Azeite de Oliva', 'Azeite de Oliva', 'almoco', 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/azeite.jpg', 'azeite.jpg', 'Azeite de oliva extra virgem', ARRAY['azeite','oliva','gordura boa','tempero'], ARRAY['azeite','azeite de oliva','olive oil'], true, 204, ARRAY[]::text[])
ON CONFLICT (slug) DO UPDATE SET
  image_url = EXCLUDED.image_url,
  image_path = EXCLUDED.image_path,
  is_active = true;

-- Insert aliases for new items
INSERT INTO public.meal_visual_aliases (library_item_id, alias, normalized_alias)
SELECT id, unnest, unnest FROM public.meal_visual_library, unnest(ARRAY['wrap integral', 'wrap', 'rap10', 'tortilha integral', 'wrap de frango']) WHERE slug = 'wrap-integral'
ON CONFLICT DO NOTHING;

INSERT INTO public.meal_visual_aliases (library_item_id, alias, normalized_alias)
SELECT id, unnest, unnest FROM public.meal_visual_library, unnest(ARRAY['banana com pasta de amendoim', 'banana com amendoim', 'banana pasta amendoim']) WHERE slug = 'banana-com-pasta-de-amendoim'
ON CONFLICT DO NOTHING;

INSERT INTO public.meal_visual_aliases (library_item_id, alias, normalized_alias)
SELECT id, unnest, unnest FROM public.meal_visual_library, unnest(ARRAY['abacate', 'avocado', 'abacate amassado']) WHERE slug = 'abacate'
ON CONFLICT DO NOTHING;

INSERT INTO public.meal_visual_aliases (library_item_id, alias, normalized_alias)
SELECT id, unnest, unnest FROM public.meal_visual_library, unnest(ARRAY['gelatina', 'gelatina diet', 'gelatina zero', 'gelatina sem acucar']) WHERE slug = 'gelatina'
ON CONFLICT DO NOTHING;

INSERT INTO public.meal_visual_aliases (library_item_id, alias, normalized_alias)
SELECT id, unnest, unnest FROM public.meal_visual_library, unnest(ARRAY['azeite', 'azeite de oliva', 'azeite extra virgem']) WHERE slug = 'azeite'
ON CONFLICT DO NOTHING;
