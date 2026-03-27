INSERT INTO ifj_intent_phrases (intent_id, phrase, phrase_type, weight, language, is_active) VALUES
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'help'), 'pode fazer', 'keyword', 3, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'help'), 'o que voce pode', 'keyword', 3, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'help'), 'me ajude', 'keyword', 2, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'help'), 'como funciona', 'keyword', 2, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'help'), 'o que da pra fazer', 'keyword', 3, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'help'), 'o que posso fazer', 'keyword', 3, 'pt-BR', true),
((SELECT id FROM ifj_intent_registry WHERE intent_key = 'help'), 'o que eu posso', 'keyword', 3, 'pt-BR', true);