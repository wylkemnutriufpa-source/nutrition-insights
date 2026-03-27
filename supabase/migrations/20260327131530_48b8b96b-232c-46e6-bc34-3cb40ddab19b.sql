
-- Add many more navigation phrases for better coverage
INSERT INTO ifj_intent_phrases (intent_id, phrase, phrase_type, weight, is_active) VALUES
-- Anamnese variations
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'anamnese', 'keyword', 4, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'anaminese', 'keyword', 4, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'formulario', 'keyword', 2, true),
-- Receitas
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'receitas', 'keyword', 3, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'biblioteca', 'keyword', 3, true),
-- Chat
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'chat', 'keyword', 3, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'mensagens', 'keyword', 3, true),
-- Onboarding/Pipeline
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'onboarding', 'keyword', 3, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'pipeline', 'keyword', 3, true),
-- Agenda
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'agenda', 'keyword', 3, true),
-- Settings
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'configuracoes', 'keyword', 3, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'ajustes', 'keyword', 2, true),
-- More nav verbs
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'me leve', 'synonym', 3, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'me mostre', 'synonym', 3, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'quero ver', 'synonym', 3, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'abrir', 'synonym', 3, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'acessar', 'synonym', 3, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'vai para', 'synonym', 3, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'vamos para', 'synonym', 3, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'entre em', 'synonym', 2, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'tela de', 'synonym', 2, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'pagina de', 'synonym', 2, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'modulo de', 'synonym', 2, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'secao de', 'synonym', 2, true),
-- Control Tower
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'control tower', 'keyword', 4, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'torre de controle', 'keyword', 4, true),
-- Avaliação física
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'avaliacao', 'keyword', 3, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'avaliacoes', 'keyword', 3, true),
-- IFJ / Intelligence
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'ifj', 'keyword', 3, true),
('1081b4fb-0ceb-448c-a43d-4f729ed3d22e', 'inteligencia', 'keyword', 3, true)
ON CONFLICT DO NOTHING;
