CREATE OR REPLACE FUNCTION public.sync_meal_item_image()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.visual_library_item_id IS NOT NULL THEN
    -- Tenta buscar por ID (UUID) primeiro, se falhar ou se for um texto que não é UUID válido, tenta por slug
    BEGIN
      SELECT image_url INTO NEW.image_url 
      FROM public.meal_visual_library 
      WHERE id = NEW.visual_library_item_id::uuid;
    EXCEPTION WHEN others THEN
      -- Se não for um UUID válido ou não encontrar, tenta pelo slug
      SELECT image_url INTO NEW.image_url 
      FROM public.meal_visual_library 
      WHERE slug = NEW.visual_library_item_id::text;
    END;
    
    -- Se ainda assim não encontrar por slug direto, tenta novamente apenas se a busca por UUID falhou
    IF NEW.image_url IS NULL THEN
       SELECT image_url INTO NEW.image_url 
       FROM public.meal_visual_library 
       WHERE slug = NEW.visual_library_item_id::text;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;