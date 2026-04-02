
-- Insert LLM master flag
INSERT INTO public.feature_flags (key, enabled, description, graceful_degradation)
VALUES ('llm_global_enabled', false, 'Controle master de IA LLM — somente admin pode ativar. Quando desabilitado, nenhum profissional ou paciente pode usar funcionalidades de IA generativa (Gemini/OpenAI).', true)
ON CONFLICT (key) DO NOTHING;
