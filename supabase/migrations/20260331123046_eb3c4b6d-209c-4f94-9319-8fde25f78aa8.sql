
-- Mass backfill visual_library_item_id for all meal_plan_items
-- Strategy 1: Direct title match against aliases
UPDATE meal_plan_items mpi
SET visual_library_item_id = sub.library_item_id
FROM (
  SELECT DISTINCT ON (mva2.normalized_alias) mva2.normalized_alias, mva2.library_item_id
  FROM meal_visual_aliases mva2
) sub
WHERE mpi.visual_library_item_id IS NULL
  AND lower(regexp_replace(
    translate(lower(mpi.title), 'áàâãéèêíìîóòôõúùûçñ', 'aaaaeeeiiioooouuucn'),
    '[^a-z0-9 ]', '', 'g'
  )) = sub.normalized_alias;

-- Strategy 2: Direct title-to-protein for specific food-name titles
UPDATE meal_plan_items SET visual_library_item_id = '56dcb495-b7bf-4c70-9a8b-825874eaa89a' WHERE visual_library_item_id IS NULL AND lower(title) IN ('frango', 'peito de frango', 'frango grelhado', 'frango desfiado');
UPDATE meal_plan_items SET visual_library_item_id = 'b555e8c1-5093-4941-b02a-f6d656b5df33' WHERE visual_library_item_id IS NULL AND lower(title) IN ('carne', 'carne vermelha', 'carne moida', 'carne moída', 'bife', 'patinho');
UPDATE meal_plan_items SET visual_library_item_id = '3d8b6965-6d90-4e65-9fea-643e0321129b' WHERE visual_library_item_id IS NULL AND lower(title) IN ('peixe', 'salmão', 'salmao', 'tilapia', 'tilÃ¡pia', 'atum');
UPDATE meal_plan_items SET visual_library_item_id = '019959b0-e698-4a8a-adf8-4f93f7486998' WHERE visual_library_item_id IS NULL AND lower(title) IN ('omelete', 'ovos mexidos', 'ovo');
UPDATE meal_plan_items SET visual_library_item_id = '7152adb4-a0f5-4eb5-a253-8633a1d38aef' WHERE visual_library_item_id IS NULL AND lower(title) IN ('ovos cozidos', '2 ovos', 'ovos');
UPDATE meal_plan_items SET visual_library_item_id = '9ab0c833-7f14-4b7a-8c80-eaf8b0d18ff9' WHERE visual_library_item_id IS NULL AND lower(title) IN ('banana', 'banana com pasta de amendoim');
UPDATE meal_plan_items SET visual_library_item_id = 'fe027a7c-6ecb-4d5f-8477-825b03ae4d38' WHERE visual_library_item_id IS NULL AND lower(title) IN ('aveia', 'aveia com banana', 'mingau');
UPDATE meal_plan_items SET visual_library_item_id = '9502033c-ff6f-4815-814c-c8e484feae94' WHERE visual_library_item_id IS NULL AND lower(title) IN ('iogurte', 'iogurte natural', 'iogurte integral');
UPDATE meal_plan_items SET visual_library_item_id = '779141a6-0b43-4a12-9e41-6bbb5a84cf54' WHERE visual_library_item_id IS NULL AND lower(title) IN ('granola', 'granola com iogurte');
UPDATE meal_plan_items SET visual_library_item_id = '2bea781e-7d34-495f-b4b0-6f842d786f89' WHERE visual_library_item_id IS NULL AND lower(title) IN ('salada', 'salada completa', 'folhas');
UPDATE meal_plan_items SET visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29' WHERE visual_library_item_id IS NULL AND lower(title) IN ('fruta', 'frutas');
UPDATE meal_plan_items SET visual_library_item_id = '804477bb-85f0-46a7-aa65-1d58ea916855' WHERE visual_library_item_id IS NULL AND lower(title) IN ('salada de frutas', 'mix de frutas');
UPDATE meal_plan_items SET visual_library_item_id = '8e48b05c-8f30-474e-9ed8-4aff86a67737' WHERE visual_library_item_id IS NULL AND lower(title) IN ('leite', 'leite com aveia');
UPDATE meal_plan_items SET visual_library_item_id = '1fb38422-3f5d-4c69-b755-7fc677c6279d' WHERE visual_library_item_id IS NULL AND lower(title) IN ('tapioca', 'tapioca com ovo');
UPDATE meal_plan_items SET visual_library_item_id = '390285ff-89c2-4b3d-8fff-2f65fb40d445' WHERE visual_library_item_id IS NULL AND lower(title) IN ('queijo branco', 'queijo');
UPDATE meal_plan_items SET visual_library_item_id = '3fe9f013-b0b8-4039-b727-cbda907a31db' WHERE visual_library_item_id IS NULL AND lower(title) LIKE '%chá%';
UPDATE meal_plan_items SET visual_library_item_id = 'da4dc200-bc32-47fc-b37c-c3214dd80d4a' WHERE visual_library_item_id IS NULL AND lower(title) LIKE '%wrap%';
UPDATE meal_plan_items SET visual_library_item_id = 'de3a0afe-aaac-4302-a470-22c877bcc1ae' WHERE visual_library_item_id IS NULL AND lower(title) LIKE '%panqueca%';
UPDATE meal_plan_items SET visual_library_item_id = '230de920-e15c-4f10-9a36-d590c272bc96' WHERE visual_library_item_id IS NULL AND lower(title) LIKE '%pão%ovo%';

-- Strategy 3: Protein keyword extraction from description for generic titles
UPDATE meal_plan_items SET visual_library_item_id = '56dcb495-b7bf-4c70-9a8b-825874eaa89a' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(frango|peito de frango)';
UPDATE meal_plan_items SET visual_library_item_id = 'b555e8c1-5093-4941-b02a-f6d656b5df33' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(carne|bife|patinho|acém|alcatra|picanha|costelinha|costela)';
UPDATE meal_plan_items SET visual_library_item_id = '3d8b6965-6d90-4e65-9fea-643e0321129b' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(peixe|salmão|salmao|tilápia|tilapia|atum|file de peixe|filé de peixe)';
UPDATE meal_plan_items SET visual_library_item_id = '019959b0-e698-4a8a-adf8-4f93f7486998' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(omelete|ovos mexidos)';
UPDATE meal_plan_items SET visual_library_item_id = '7152adb4-a0f5-4eb5-a253-8633a1d38aef' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(ovos? cozido)';
UPDATE meal_plan_items SET visual_library_item_id = '1fb38422-3f5d-4c69-b755-7fc677c6279d' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(tapioca)';
UPDATE meal_plan_items SET visual_library_item_id = '299a62f6-a586-46ac-b4ae-879476e6bb69' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(crepioca)';
UPDATE meal_plan_items SET visual_library_item_id = 'ac25dff5-3666-497a-98de-83677d7508f3' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(cuscuz)';
UPDATE meal_plan_items SET visual_library_item_id = '7d6988fc-f664-4502-9d85-44f44d6b0319' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(panqueca)';
UPDATE meal_plan_items SET visual_library_item_id = '779141a6-0b43-4a12-9e41-6bbb5a84cf54' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(iogurte.+granola|granola.+iogurte)';
UPDATE meal_plan_items SET visual_library_item_id = '1e4eca44-1abf-4042-bceb-654316a3ec02' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(iogurte.+banana|banana.+iogurte)';
UPDATE meal_plan_items SET visual_library_item_id = '9502033c-ff6f-4815-814c-c8e484feae94' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(iogurte)';
UPDATE meal_plan_items SET visual_library_item_id = 'fe027a7c-6ecb-4d5f-8477-825b03ae4d38' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(aveia|mingau)';
UPDATE meal_plan_items SET visual_library_item_id = '9ab0c833-7f14-4b7a-8c80-eaf8b0d18ff9' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(banana.+amendoim|amendoim.+banana)';
UPDATE meal_plan_items SET visual_library_item_id = '230de920-e15c-4f10-9a36-d590c272bc96' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(pão com ovo|pao com ovo)';
UPDATE meal_plan_items SET visual_library_item_id = 'fb6a9361-1560-479c-a813-692d8e2709d0' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(pão de queijo|pao de queijo)';
UPDATE meal_plan_items SET visual_library_item_id = 'b69a01f3-985a-49fd-9a54-fbb08b1f0dc8' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(sopa)';
UPDATE meal_plan_items SET visual_library_item_id = '804477bb-85f0-46a7-aa65-1d58ea916855' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(salada de fruta|frutas)';
UPDATE meal_plan_items SET visual_library_item_id = '2bea781e-7d34-495f-b4b0-6f842d786f89' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(salada)';
UPDATE meal_plan_items SET visual_library_item_id = '3fe9f013-b0b8-4039-b727-cbda907a31db' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(chá|cha de)';
UPDATE meal_plan_items SET visual_library_item_id = '1686c42e-d235-4007-8726-b1ef35d74a72' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(açaí|acai)';
UPDATE meal_plan_items SET visual_library_item_id = '6006e425-ad8c-4a45-84c6-c9a9edafc935' WHERE visual_library_item_id IS NULL AND description IS NOT NULL AND lower(description) ~ '(vitamina)';

-- Also backfill saved_meals
UPDATE saved_meals SET visual_library_item_id = '56dcb495-b7bf-4c70-9a8b-825874eaa89a' WHERE visual_library_item_id IS NULL AND lower(title) ~ '(frango)';
UPDATE saved_meals SET visual_library_item_id = 'b555e8c1-5093-4941-b02a-f6d656b5df33' WHERE visual_library_item_id IS NULL AND lower(title) ~ '(carne|bife)';
UPDATE saved_meals SET visual_library_item_id = '3d8b6965-6d90-4e65-9fea-643e0321129b' WHERE visual_library_item_id IS NULL AND lower(title) ~ '(peixe|salmão|tilápia|atum)';
UPDATE saved_meals SET visual_library_item_id = '019959b0-e698-4a8a-adf8-4f93f7486998' WHERE visual_library_item_id IS NULL AND lower(title) ~ '(omelete)';

-- Create auto-association trigger for future inserts
CREATE OR REPLACE FUNCTION public.auto_resolve_visual_library()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _norm text;
  _matched_id uuid;
  _desc_lower text;
BEGIN
  -- Skip if already set
  IF NEW.visual_library_item_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Normalize title
  _norm := lower(regexp_replace(
    translate(lower(COALESCE(NEW.title, '')), 'áàâãéèêíìîóòôõúùûçñ', 'aaaaeeeiiioooouuucn'),
    '[^a-z0-9 ]', '', 'g'
  ));

  -- Try exact alias match
  SELECT library_item_id INTO _matched_id
  FROM meal_visual_aliases
  WHERE normalized_alias = _norm
  LIMIT 1;

  IF _matched_id IS NOT NULL THEN
    NEW.visual_library_item_id := _matched_id;
    RETURN NEW;
  END IF;

  -- Try protein keyword from title
  IF _norm ~ '(frango|peito de frango)' THEN
    NEW.visual_library_item_id := '56dcb495-b7bf-4c70-9a8b-825874eaa89a';
  ELSIF _norm ~ '(carne|bife|patinho)' THEN
    NEW.visual_library_item_id := 'b555e8c1-5093-4941-b02a-f6d656b5df33';
  ELSIF _norm ~ '(peixe|salmao|tilapia|atum)' THEN
    NEW.visual_library_item_id := '3d8b6965-6d90-4e65-9fea-643e0321129b';
  ELSIF _norm ~ '(omelete)' THEN
    NEW.visual_library_item_id := '019959b0-e698-4a8a-adf8-4f93f7486998';
  ELSIF _norm ~ '(ovo)' THEN
    NEW.visual_library_item_id := '7152adb4-a0f5-4eb5-a253-8633a1d38aef';
  ELSIF _norm ~ '(banana)' THEN
    NEW.visual_library_item_id := '9ab0c833-7f14-4b7a-8c80-eaf8b0d18ff9';
  ELSIF _norm ~ '(iogurte)' THEN
    NEW.visual_library_item_id := '9502033c-ff6f-4815-814c-c8e484feae94';
  ELSIF _norm ~ '(aveia|mingau)' THEN
    NEW.visual_library_item_id := 'fe027a7c-6ecb-4d5f-8477-825b03ae4d38';
  ELSIF _norm ~ '(tapioca)' THEN
    NEW.visual_library_item_id := '1fb38422-3f5d-4c69-b755-7fc677c6279d';
  ELSIF _norm ~ '(salada)' THEN
    NEW.visual_library_item_id := '2bea781e-7d34-495f-b4b0-6f842d786f89';
  ELSIF _norm ~ '(cha )' THEN
    NEW.visual_library_item_id := '3fe9f013-b0b8-4039-b727-cbda907a31db';
  END IF;

  IF NEW.visual_library_item_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Try protein keyword from description
  _desc_lower := lower(COALESCE(NEW.description, ''));
  IF _desc_lower ~ '(frango|peito de frango)' THEN
    NEW.visual_library_item_id := '56dcb495-b7bf-4c70-9a8b-825874eaa89a';
  ELSIF _desc_lower ~ '(carne|bife|patinho|costelinha|picanha|alcatra)' THEN
    NEW.visual_library_item_id := 'b555e8c1-5093-4941-b02a-f6d656b5df33';
  ELSIF _desc_lower ~ '(peixe|salmão|tilápia|atum)' THEN
    NEW.visual_library_item_id := '3d8b6965-6d90-4e65-9fea-643e0321129b';
  ELSIF _desc_lower ~ '(omelete)' THEN
    NEW.visual_library_item_id := '019959b0-e698-4a8a-adf8-4f93f7486998';
  ELSIF _desc_lower ~ '(ovos? cozido)' THEN
    NEW.visual_library_item_id := '7152adb4-a0f5-4eb5-a253-8633a1d38aef';
  ELSIF _desc_lower ~ '(tapioca)' THEN
    NEW.visual_library_item_id := '1fb38422-3f5d-4c69-b755-7fc677c6279d';
  ELSIF _desc_lower ~ '(panqueca)' THEN
    NEW.visual_library_item_id := '7d6988fc-f664-4502-9d85-44f44d6b0319';
  ELSIF _desc_lower ~ '(iogurte)' THEN
    NEW.visual_library_item_id := '9502033c-ff6f-4815-814c-c8e484feae94';
  ELSIF _desc_lower ~ '(aveia|mingau)' THEN
    NEW.visual_library_item_id := 'fe027a7c-6ecb-4d5f-8477-825b03ae4d38';
  ELSIF _desc_lower ~ '(salada)' THEN
    NEW.visual_library_item_id := '2bea781e-7d34-495f-b4b0-6f842d786f89';
  ELSIF _desc_lower ~ '(chá|cha de)' THEN
    NEW.visual_library_item_id := '3fe9f013-b0b8-4039-b727-cbda907a31db';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to meal_plan_items
DROP TRIGGER IF EXISTS trg_auto_visual_library ON meal_plan_items;
CREATE TRIGGER trg_auto_visual_library
  BEFORE INSERT OR UPDATE OF title, description ON meal_plan_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_visual_library();

-- Attach trigger to saved_meals
DROP TRIGGER IF EXISTS trg_auto_visual_library_saved ON saved_meals;
CREATE TRIGGER trg_auto_visual_library_saved
  BEFORE INSERT OR UPDATE OF title ON saved_meals
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_visual_library();
