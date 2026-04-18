---
name: Auto-redirect da anamnese no OnboardingPipeline
description: Step 1 (anamnese) do OnboardingPipeline não usa mais botão Link — redireciona automaticamente para /anamnesis?pipeline=true via navigate + window.location fallback. Resolve travamento iOS/PWA.
type: feature
---

# Regra
- `OnboardingPipeline.tsx` Step 1 renderiza componente `AnamnesisAutoRedirect` (definido no mesmo arquivo).
- AnamnesisAutoRedirect dispara `navigate("/anamnesis?pipeline=true", { replace: true })` em 50ms e força `window.location.href` em 1200ms se ainda não saiu da rota.
- Mantém botão `<a href>` visível como último fallback manual.
- Motivo: pacientes (Josiane, Erica, etc.) ficavam permanentemente travadas após aceitar consentimento porque o `<Link>` do React Router não disparava no Safari iOS PWA — clique não navegava, não dava erro, paciente não conseguia preencher anamnese.

# Onde
- `src/pages/OnboardingPipeline.tsx` (componente AnamnesisAutoRedirect no final do arquivo)
