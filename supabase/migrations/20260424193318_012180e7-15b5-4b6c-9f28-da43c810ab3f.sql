CREATE OR REPLACE FUNCTION public.validate_meal_image_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_payload jsonb;
  v_recipe_id text;
BEGIN
  v_payload := to_jsonb(NEW);

  IF (v_payload ? 'image_url')
     AND v_payload->>'image_url' IS NOT NULL
     AND (v_payload ? 'recipe_id') THEN
    v_recipe_id := v_payload->>'recipe_id';
    IF v_recipe_id IS NULL OR btrim(v_recipe_id) = '' THEN
      NEW.image_url := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;