
-- Add clinical_tags column (nullable, default empty array)
ALTER TABLE public.meal_visual_library 
ADD COLUMN IF NOT EXISTS clinical_tags text[] DEFAULT '{}';

-- Create index for efficient tag-based filtering
CREATE INDEX IF NOT EXISTS idx_meal_visual_library_clinical_tags 
ON public.meal_visual_library USING GIN(clinical_tags);

-- Auto-populate clinical_tags using coalesce to avoid NULL from array_agg
UPDATE public.meal_visual_library SET clinical_tags = coalesce((
  SELECT array_agg(DISTINCT tag) FROM (
    SELECT 'contains_lactose' AS tag
    WHERE lower(meal_visual_library.display_name) ~* '(leite|queijo|iogurte|requeijao|cream|coalho|mussarela|ricota|manteiga|nata|whey|creme de leite|coalhada|muçarela|mozzarella|parmesao|provolone|catupiry)'
       OR array_to_string(meal_visual_library.tags, ' ') ~* '(laticinio|leite|queijo|iogurte|whey|ricota)'
       OR array_to_string(meal_visual_library.search_terms, ' ') ~* '(leite|queijo|iogurte|requeijao|whey|ricota|coalho|mussarela|manteiga)'
       OR coalesce(meal_visual_library.base_recipe,'') ~* '(leite|queijo|iogurte|requeijao|whey|ricota|coalho|mussarela|manteiga|cream|nata|creme de leite)'
    UNION ALL
    SELECT 'contains_gluten'
    WHERE lower(meal_visual_library.display_name) ~* '(pão|macarr|trigo|biscoito|bolo|wrap|torrada|farinha de trigo|aveia|cuscuz|massa|lasanha|pizza)'
       OR array_to_string(meal_visual_library.tags, ' ') ~* '(gluten|massa|macarrao)'
       OR array_to_string(meal_visual_library.search_terms, ' ') ~* '(pão|macarr|trigo|biscoito|bolo|wrap|torrada|aveia|cuscuz)'
       OR coalesce(meal_visual_library.base_recipe,'') ~* '(pão|macarr|trigo|biscoito|bolo|farinha de trigo|aveia)'
    UNION ALL
    SELECT 'contains_egg'
    WHERE lower(meal_visual_library.display_name) ~* '(\yovo\y|ovos|omelete|omelette|fritada)'
       OR array_to_string(meal_visual_library.search_terms, ' ') ~* '(\yovo\y|ovos|omelete)'
    UNION ALL
    SELECT 'contains_soy'
    WHERE lower(meal_visual_library.display_name) ~* '(soja|tofu|edamame|missô|shoyu)'
       OR array_to_string(meal_visual_library.search_terms, ' ') ~* '(soja|tofu|edamame)'
    UNION ALL
    SELECT 'contains_nuts'
    WHERE lower(meal_visual_library.display_name) ~* '(castanha|amendoim|nozes|amêndoa|amendoa|macadâmia|pistache|pecã|avelã|nuts)'
       OR array_to_string(meal_visual_library.tags, ' ') ~* '(nuts|oleaginosa|castanha)'
       OR array_to_string(meal_visual_library.search_terms, ' ') ~* '(castanha|amendoim|nozes|amêndoa|nuts)'
    UNION ALL
    SELECT 'contains_seafood'
    WHERE lower(meal_visual_library.display_name) ~* '(camarão|camarao|lula|polvo|marisco|lagosta|caranguejo|siri|mexilhão|ostra)'
       OR array_to_string(meal_visual_library.tags, ' ') ~* '(frutos-do-mar)'
       OR array_to_string(meal_visual_library.search_terms, ' ') ~* '(camarão|camarao|lula|polvo|marisco)'
    UNION ALL
    SELECT 'animal_protein'
    WHERE lower(meal_visual_library.display_name) ~* '(frango|carne|bife|peixe|tilápia|tilapia|porco|sardinha|atum|salmão|salmao|sobrecoxa|alcatra|picanha|linguiça|linguica|bacon|presunto|peru|acém|acem|lombo|costel|maminha|patinho|filé|file|merluza|camarão|camarao)'
       OR array_to_string(meal_visual_library.tags, ' ') ~* '(carne|frango|peixe|porco)'
    UNION ALL
    SELECT 'plant_based'
    WHERE lower(meal_visual_library.display_name) ~* '(salada|legumes|verdura|brócolis|brocolis|espinafre|couve|rúcula|rucula|alface|tomate|cenoura|abobrinha|abóbora|abobora|berinjela|pepino|chuchu|quiabo)'
       AND lower(meal_visual_library.display_name) !~* '(frango|carne|bife|peixe|porco|ovo|bacon|presunto|linguiça)'
    UNION ALL
    SELECT 'high_protein'
    WHERE meal_visual_library.default_protein >= 25
    UNION ALL
    SELECT 'high_carb'
    WHERE meal_visual_library.default_carbs >= 40
    UNION ALL
    SELECT 'low_carb'
    WHERE meal_visual_library.default_carbs IS NOT NULL AND meal_visual_library.default_carbs <= 15
    UNION ALL
    SELECT 'high_fat'
    WHERE meal_visual_library.default_fat >= 20
    UNION ALL
    SELECT 'whole_food'
    WHERE lower(meal_visual_library.display_name) ~* '(banana|maçã|maca|mamão|mamao|laranja|goiaba|morango|tangerina|melancia|abacaxi|manga|uva|kiwi|pitaya|açaí|acai|coco|abacate|batata|arroz|feijão|feijao|lentilha|milho|mandioca|inhame|macaxeira)'
    UNION ALL
    SELECT 'processed'
    WHERE lower(meal_visual_library.display_name) ~* '(granola|barra|suplemento|whey|shake|caseína|caseina)'
  ) tags_computed
), '{}');
