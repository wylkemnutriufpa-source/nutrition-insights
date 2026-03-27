
-- Update existing foods with synonyms
UPDATE public.ifj_food_database SET synonyms = ARRAY['arroz branco', 'arroz cozido', 'arroz simples'] WHERE normalized_name = 'arroz branco';
UPDATE public.ifj_food_database SET synonyms = ARRAY['arroz integral', 'arroz integral cozido'] WHERE normalized_name = 'arroz integral';
UPDATE public.ifj_food_database SET synonyms = ARRAY['feijao preto', 'feijao preto cozido'] WHERE normalized_name = 'feijao preto';
UPDATE public.ifj_food_database SET synonyms = ARRAY['feijao carioca', 'feijao carioquinha', 'feijao marrom'] WHERE normalized_name = 'feijao carioca';
UPDATE public.ifj_food_database SET synonyms = ARRAY['frango grelhado', 'peito de frango', 'frango'] WHERE normalized_name = 'frango grelhado';
UPDATE public.ifj_food_database SET synonyms = ARRAY['ovo cozido', 'ovo', 'ovos cozidos', 'ovos'] WHERE normalized_name = 'ovo cozido';
UPDATE public.ifj_food_database SET synonyms = ARRAY['banana', 'banana prata', 'banana nanica', 'banana da terra'] WHERE normalized_name = 'banana';
UPDATE public.ifj_food_database SET synonyms = ARRAY['batata doce', 'batata doce cozida'] WHERE normalized_name = 'batata doce';
