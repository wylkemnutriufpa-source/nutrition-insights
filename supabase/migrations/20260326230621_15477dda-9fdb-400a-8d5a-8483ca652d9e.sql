-- Fix: Add missing phrases for better intent matching
INSERT INTO ifj_intent_phrases (intent_id, phrase, phrase_type, weight, language, is_active) VALUES
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'navigate'), 'planos alimentares', 'keyword', 3, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'navigate'), 'plano alimentar', 'keyword', 3, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'navigate'), 'lista de pacientes', 'keyword', 3, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'meal_plan'), 'plano alimentar', 'keyword', 3, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'meal_plan'), 'planos alimentares', 'keyword', 3, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'meal_plan'), 'dieta', 'keyword', 2, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'meal_plan'), 'cardapio', 'keyword', 2, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'food_substitution'), 'pode comer no lugar', 'keyword', 4, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'food_substitution'), 'no lugar do', 'keyword', 3, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'food_substitution'), 'no lugar da', 'keyword', 3, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'food_substitution'), 'o que usar', 'keyword', 2, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'nutrition_question'), 'pode comer', 'keyword', 2, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'nutrition_question'), 'posso comer', 'keyword', 3, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'nutrition_question'), 'faz mal', 'keyword', 2, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'nutrition_question'), 'engorda', 'keyword', 2, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'nutrition_question'), 'emagrece', 'keyword', 2, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'nutrition_question'), 'atrapalha', 'keyword', 2, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'action_release_all_onboarding'), 'libera todos', 'keyword', 3, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'action_release_all_onboarding'), 'libera todas', 'keyword', 3, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'portfolio_health'), 'pacientes', 'keyword', 1, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'portfolio_health'), 'meus pacientes', 'keyword', 3, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'portfolio_health'), 'carteira', 'keyword', 2, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'help'), 'o que voce faz', 'keyword', 2, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'help'), 'comandos', 'keyword', 2, 'pt-BR', true);

UPDATE ifj_intent_registry SET priority_order = 5 WHERE intent_key = 'food_substitution';
UPDATE ifj_intent_registry SET priority_order = 6 WHERE intent_key = 'nutrition_question';