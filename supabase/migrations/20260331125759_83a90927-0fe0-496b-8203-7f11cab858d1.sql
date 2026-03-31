
-- Create a function that auto-resolves visual_library_item_id on insert
-- Uses alias exact match + protein-keyword fallback
CREATE OR REPLACE FUNCTION auto_resolve_visual_library_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _norm TEXT;
  _match UUID;
  _word TEXT;
  _protein_base TEXT;
BEGIN
  -- Skip if already set or no title
  IF NEW.visual_library_item_id IS NOT NULL OR NEW.title IS NULL OR trim(NEW.title) = '' THEN
    RETURN NEW;
  END IF;

  -- Normalize the title
  _norm := lower(trim(
    regexp_replace(
      regexp_replace(
        translate(lower(trim(NEW.title)),
          'àáâãäåèéêëìíîïòóôõöùúûüýÿñç',
          'aaaaaaeeeeiiiioooooouuuuyync'),
        '[^a-z0-9 ]', '', 'g'),
      '\s+', ' ', 'g')
  ));

  -- Strategy 1: exact alias match
  SELECT library_item_id INTO _match
  FROM meal_visual_aliases
  WHERE normalized_alias = _norm
  LIMIT 1;

  IF _match IS NOT NULL THEN
    -- Verify item is active
    IF EXISTS (SELECT 1 FROM meal_visual_library WHERE id = _match AND is_active = true) THEN
      NEW.visual_library_item_id := _match;
      RETURN NEW;
    END IF;
  END IF;

  -- Strategy 2: protein-keyword matching
  FOR _word IN SELECT unnest(string_to_array(_norm, ' '))
  LOOP
    -- Skip carb keywords
    IF _word IN ('arroz','batata','macarrao','feijao','pure','mandioca','inhame','legumes','salada') THEN
      CONTINUE;
    END IF;

    -- Map protein keywords
    _protein_base := CASE _word
      WHEN 'frango' THEN 'frango'
      WHEN 'carne' THEN 'carne'
      WHEN 'bife' THEN 'carne'
      WHEN 'peixe' THEN 'peixe'
      WHEN 'tilapia' THEN 'peixe'
      WHEN 'salmao' THEN 'peixe'
      WHEN 'camarao' THEN 'camarao'
      WHEN 'ovo' THEN 'ovo'
      WHEN 'ovos' THEN 'ovo'
      WHEN 'omelete' THEN 'ovo'
      ELSE NULL
    END;

    IF _protein_base IS NOT NULL THEN
      SELECT mva.library_item_id INTO _match
      FROM meal_visual_aliases mva
      JOIN meal_visual_library mvl ON mvl.id = mva.library_item_id AND mvl.is_active = true
      WHERE mva.normalized_alias = _protein_base
         OR mva.normalized_alias LIKE _protein_base || ' %'
      LIMIT 1;

      IF _match IS NOT NULL THEN
        NEW.visual_library_item_id := _match;
        RETURN NEW;
      END IF;
      EXIT; -- Stop after first protein found
    END IF;
  END LOOP;

  -- Strategy 3: partial match
  SELECT mva.library_item_id INTO _match
  FROM meal_visual_aliases mva
  JOIN meal_visual_library mvl ON mvl.id = mva.library_item_id AND mvl.is_active = true
  WHERE _norm LIKE '%' || mva.normalized_alias || '%'
     OR mva.normalized_alias LIKE '%' || _norm || '%'
  LIMIT 1;

  IF _match IS NOT NULL THEN
    NEW.visual_library_item_id := _match;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply trigger to meal_plan_items
DROP TRIGGER IF EXISTS trg_auto_visual_meal_plan_items ON meal_plan_items;
CREATE TRIGGER trg_auto_visual_meal_plan_items
  BEFORE INSERT ON meal_plan_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_visual_library_item();

-- Apply trigger to saved_meals
DROP TRIGGER IF EXISTS trg_auto_visual_saved_meals ON saved_meals;
CREATE TRIGGER trg_auto_visual_saved_meals
  BEFORE INSERT ON saved_meals
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_visual_library_item();
