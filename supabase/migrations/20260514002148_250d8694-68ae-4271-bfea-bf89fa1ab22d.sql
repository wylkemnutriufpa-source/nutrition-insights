-- Dropar se existirem para evitar conflitos
DROP POLICY IF EXISTS "Leitura pública v3_library_items" ON public.v3_library_items;
DROP POLICY IF EXISTS "Escrita total para admins v3_library_items" ON public.v3_library_items;
DROP POLICY IF EXISTS "Leitura pública v3_library_images" ON public.v3_library_images;
DROP POLICY IF EXISTS "Escrita total para admins v3_library_images" ON public.v3_library_images;
DROP POLICY IF EXISTS "Leitura pública v3_clusters" ON public.v3_clusters;
DROP POLICY IF EXISTS "Escrita total para admins v3_clusters" ON public.v3_clusters;
DROP POLICY IF EXISTS "Leitura pública v3_substitutions" ON public.v3_substitutions;
DROP POLICY IF EXISTS "Escrita total para admins v3_substitutions" ON public.v3_substitutions;

-- Recriar
CREATE POLICY "Leitura pública v3_library_items" ON public.v3_library_items FOR SELECT USING (true);
CREATE POLICY "Escrita total v3_library_items" ON public.v3_library_items FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública v3_library_images" ON public.v3_library_images FOR SELECT USING (true);
CREATE POLICY "Escrita total v3_library_images" ON public.v3_library_images FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública v3_clusters" ON public.v3_clusters FOR SELECT USING (true);
CREATE POLICY "Escrita total v3_clusters" ON public.v3_clusters FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública v3_substitutions" ON public.v3_substitutions FOR SELECT USING (true);
CREATE POLICY "Escrita total v3_substitutions" ON public.v3_substitutions FOR ALL USING (true) WITH CHECK (true);
