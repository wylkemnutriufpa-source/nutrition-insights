
-- Final pass: match remaining items by description keywords
-- Fruits/snacks
UPDATE meal_plan_items SET visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29' 
WHERE visual_library_item_id IS NULL AND description IS NOT NULL 
  AND lower(description) ~ '(banana|maçã|maca|mamão|mamao|laranja|goiaba|pêssego|pessego|pera|morango|manga|melão|abacaxi|uva|kiwi|tangerina)';

-- Castanhas/nuts -> fruta (closest visual)
UPDATE meal_plan_items SET visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29' 
WHERE visual_library_item_id IS NULL AND description IS NOT NULL 
  AND lower(description) ~ '(castanha|amêndoa|amendoa|nozes|pistache|nuts)';

-- Leite
UPDATE meal_plan_items SET visual_library_item_id = '8e48b05c-8f30-474e-9ed8-4aff86a67737' 
WHERE visual_library_item_id IS NULL AND description IS NOT NULL 
  AND lower(description) ~ '(leite)';

-- Pão/bread
UPDATE meal_plan_items SET visual_library_item_id = '390285ff-89c2-4b3d-8fff-2f65fb40d445' 
WHERE visual_library_item_id IS NULL AND description IS NOT NULL 
  AND lower(description) ~ '(pão|pao francês|pao frances)';

-- Café
UPDATE meal_plan_items SET visual_library_item_id = '3fe9f013-b0b8-4039-b727-cbda907a31db' 
WHERE visual_library_item_id IS NULL AND description IS NOT NULL 
  AND lower(description) ~ '(café|cafe)';

-- Água/water -> chá (closest)
UPDATE meal_plan_items SET visual_library_item_id = '3fe9f013-b0b8-4039-b727-cbda907a31db' 
WHERE visual_library_item_id IS NULL AND description IS NOT NULL 
  AND lower(description) ~ '(água|agua)';

-- Title-based for remaining specific foods
UPDATE meal_plan_items SET visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29' WHERE visual_library_item_id IS NULL AND lower(title) IN ('uva', 'maçã', 'mamão', 'pera', 'morango', 'manga', 'laranja', 'goiaba', 'abacaxi');
UPDATE meal_plan_items SET visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29' WHERE visual_library_item_id IS NULL AND lower(title) IN ('mix castanhas', 'castanhas', 'nuts', 'nozes', 'amêndoas');
UPDATE meal_plan_items SET visual_library_item_id = '390285ff-89c2-4b3d-8fff-2f65fb40d445' WHERE visual_library_item_id IS NULL AND lower(title) IN ('pão integral', 'pão francês', 'torrada');
UPDATE meal_plan_items SET visual_library_item_id = 'fe027a7c-6ecb-4d5f-8477-825b03ae4d38' WHERE visual_library_item_id IS NULL AND lower(title) IN ('whey', 'whey caseína', 'proteína magra', 'barra proteica');
UPDATE meal_plan_items SET visual_library_item_id = '2bea781e-7d34-495f-b4b0-6f842d786f89' WHERE visual_library_item_id IS NULL AND lower(title) IN ('legumes', 'vegetais', 'brócolis', 'batata doce');
UPDATE meal_plan_items SET visual_library_item_id = 'b6cc8684-203b-46af-9711-104e0ca52a29' WHERE visual_library_item_id IS NULL AND lower(title) IN ('pasta de amendoim', 'mel', 'canela', 'cúrcuma');
UPDATE meal_plan_items SET visual_library_item_id = '3fe9f013-b0b8-4039-b727-cbda907a31db' WHERE visual_library_item_id IS NULL AND lower(title) IN ('água', 'chá funcional');
UPDATE meal_plan_items SET visual_library_item_id = 'b555e8c1-5093-4941-b02a-f6d656b5df33' WHERE visual_library_item_id IS NULL AND lower(title) IN ('patê de atum');
UPDATE meal_plan_items SET visual_library_item_id = '8e48b05c-8f30-474e-9ed8-4aff86a67737' WHERE visual_library_item_id IS NULL AND lower(title) LIKE '%leite%';

-- Also update the auto_resolve trigger to handle these
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
  IF NEW.visual_library_item_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

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

  -- Protein keywords from title
  IF _norm ~ '(frango|peito de frango)' THEN NEW.visual_library_item_id := '56dcb495-b7bf-4c70-9a8b-825874eaa89a';
  ELSIF _norm ~ '(carne|bife|patinho)' THEN NEW.visual_library_item_id := 'b555e8c1-5093-4941-b02a-f6d656b5df33';
  ELSIF _norm ~ '(peixe|salmao|tilapia|atum)' THEN NEW.visual_library_item_id := '3d8b6965-6d90-4e65-9fea-643e0321129b';
  ELSIF _norm ~ '(omelete)' THEN NEW.visual_library_item_id := '019959b0-e698-4a8a-adf8-4f93f7486998';
  ELSIF _norm ~ '(ovos? cozido)' THEN NEW.visual_library_item_id := '7152adb4-a0f5-4eb5-a253-8633a1d38aef';
  ELSIF _norm ~ '(ovo)' THEN NEW.visual_library_item_id := '7152adb4-a0f5-4eb5-a253-8633a1d38aef';
  ELSIF _norm ~ '(banana)' THEN NEW.visual_library_item_id := '9ab0c833-7f14-4b7a-8c80-eaf8b0d18ff9';
  ELSIF _norm ~ '(iogurte)' THEN NEW.visual_library_item_id := '9502033c-ff6f-4815-814c-c8e484feae94';
  ELSIF _norm ~ '(aveia|mingau)' THEN NEW.visual_library_item_id := 'fe027a7c-6ecb-4d5f-8477-825b03ae4d38';
  ELSIF _norm ~ '(tapioca)' THEN NEW.visual_library_item_id := '1fb38422-3f5d-4c69-b755-7fc677c6279d';
  ELSIF _norm ~ '(salada)' THEN NEW.visual_library_item_id := '2bea781e-7d34-495f-b4b0-6f842d786f89';
  ELSIF _norm ~ '(crepioca)' THEN NEW.visual_library_item_id := '299a62f6-a586-46ac-b4ae-879476e6bb69';
  ELSIF _norm ~ '(panqueca)' THEN NEW.visual_library_item_id := 'de3a0afe-aaac-4302-a470-22c877bcc1ae';
  ELSIF _norm ~ '(whey|proteina)' THEN NEW.visual_library_item_id := 'fe027a7c-6ecb-4d5f-8477-825b03ae4d38';
  END IF;

  IF NEW.visual_library_item_id IS NOT NULL THEN RETURN NEW; END IF;

  -- Description-based fallback
  _desc_lower := lower(COALESCE(NEW.description, ''));
  IF length(_desc_lower) < 3 THEN RETURN NEW; END IF;

  IF _desc_lower ~ '(frango|peito de frango)' THEN NEW.visual_library_item_id := '56dcb495-b7bf-4c70-9a8b-825874eaa89a';
  ELSIF _desc_lower ~ '(carne|bife|patinho|costelinha|picanha|alcatra)' THEN NEW.visual_library_item_id := 'b555e8c1-5093-4941-b02a-f6d656b5df33';
  ELSIF _desc_lower ~ '(peixe|salmão|tilápia|atum)' THEN NEW.visual_library_item_id := '3d8b6965-6d90-4e65-9fea-643e0321129b';
  ELSIF _desc_lower ~ '(omelete)' THEN NEW.visual_library_item_id := '019959b0-e698-4a8a-adf8-4f93f7486998';
  ELSIF _desc_lower ~ '(ovos? cozido)' THEN NEW.visual_library_item_id := '7152adb4-a0f5-4eb5-a253-8633a1d38aef';
  ELSIF _desc_lower ~ '(tapioca)' THEN NEW.visual_library_item_id := '1fb38422-3f5d-4c69-b755-7fc677c6279d';
  ELSIF _desc_lower ~ '(panqueca)' THEN NEW.visual_library_item_id := '7d6988fc-f664-4502-9d85-44f44d6b0319';
  ELSIF _desc_lower ~ '(iogurte)' THEN NEW.visual_library_item_id := '9502033c-ff6f-4815-814c-c8e484feae94';
  ELSIF _desc_lower ~ '(aveia|mingau)' THEN NEW.visual_library_item_id := 'fe027a7c-6ecb-4d5f-8477-825b03ae4d38';
  ELSIF _desc_lower ~ '(banana|maçã|mamão|laranja|goiaba|morango|pêssego|fruta)' THEN NEW.visual_library_item_id := 'b6cc8684-203b-46af-9711-104e0ca52a29';
  ELSIF _desc_lower ~ '(castanha|amêndoa|nozes|pistache)' THEN NEW.visual_library_item_id := 'b6cc8684-203b-46af-9711-104e0ca52a29';
  ELSIF _desc_lower ~ '(leite)' THEN NEW.visual_library_item_id := '8e48b05c-8f30-474e-9ed8-4aff86a67737';
  ELSIF _desc_lower ~ '(pão|pao)' THEN NEW.visual_library_item_id := '390285ff-89c2-4b3d-8fff-2f65fb40d445';
  ELSIF _desc_lower ~ '(salada)' THEN NEW.visual_library_item_id := '2bea781e-7d34-495f-b4b0-6f842d786f89';
  ELSIF _desc_lower ~ '(chá|cha |café|cafe|água|agua)' THEN NEW.visual_library_item_id := '3fe9f013-b0b8-4039-b727-cbda907a31db';
  END IF;

  RETURN NEW;
END;
$$;
