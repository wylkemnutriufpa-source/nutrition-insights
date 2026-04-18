---
name: Anti-loop entre /onboarding-pipeline e /anamnesis?pipeline=true
description: Anamnesis.tsx redirecionava de volta pro pipeline quando havia patient_anamnesis.status=completed + pipeline ativo, mas o pipeline (AnamnesisAutoRedirect) redireciona pra cá → loop infinito. Fix: respeitar ?pipeline=true e renderizar a tela em vez de redirecionar.
type: feature
---

# Regra
- Em `src/pages/Anamnesis.tsx` (efeito que carrega draft/anamnese), quando `latestAnamnesis.status === "completed"` e existe `latestPipeline` ativo, **NÃO** redirecionar para `/onboarding-pipeline` se a URL trouxer `?pipeline=true`.
- Motivo: o `OnboardingPipeline` Step 1 renderiza `AnamnesisAutoRedirect` que joga a paciente em `/anamnesis?pipeline=true`. Se a anamnese estava marcada como completed (de uma sessão anterior) mas o pipeline ainda está em `pending_anamnesis`, o redirect criava loop infinito (paciente travada vendo loading e pipeline em looping).
- Comportamento correto com `?pipeline=true`: renderiza a tela de anamnese concluída (modo edição manual) e o botão "Continuar Onboarding — Próxima Etapa" leva ao pipeline manualmente, OU o auto-save de uma nova resposta marca `pipeline.anamnesis_completed=true` e libera o step seguinte.

# Onde
- `src/pages/Anamnesis.tsx` (bloco `if (latestAnamnesis.status === "completed")`, ~linha 690)
- `src/pages/OnboardingPipeline.tsx` (componente `AnamnesisAutoRedirect`, redireciona pra `/anamnesis?pipeline=true`)
