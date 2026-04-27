---
name: Fluxo único de onboarding com link enviável
description: Profissional convida paciente, copia link /onboarding (WhatsApp) ou clica "Enviar por email" (edge send-onboarding-link). Anamnese fica DENTRO de /onboarding como step 2. Único caminho.
type: feature
---

# Regra
- Único caminho de cadastro por convite: link `${origin}/cadastro?code=<CODE>`; `/convite/<CODE>` e `/~oauth/convite/<CODE>` são apenas atalhos legados que redirecionam para essa rota.
- `OnboardingPipeline` orquestra 6 steps: consent → anamnesis (link interno `/anamnesis?pipeline=true`) → body_data → preferences → plan_generation → approval. A anamnese é parte do mesmo onboarding (não rota paralela).
- Atalho do `PatientGridDashboard` ("Complete sua Anamnese") agora aponta para `/onboarding` (não mais `/anamnesis`).
- Convite de paciente (`InvitePatient`):
  - Após criar, exibe URL `/cadastro?code=<CODE>` com botão **Copiar link**/WhatsApp. Essa rota valida o código, preserva o vínculo com o profissional e segue para cadastro/onboarding.
  - Edge `send-onboarding-link`: auth + rate limit (20/15min) + role nutritionist/personal/admin + valida vínculo `nutritionist_patients` + `auth.admin.generateLink({ type: "magiclink", redirectTo: origin+/onboarding })` + cria notification in-app.
- `useOnboardingGuard` libera tudo se há plano em status published/approved/active/delivered (profissional pode entregar plano manual e paciente vê sem completar onboarding).
- Profissional NUNCA é bloqueado por guards de paciente (ver PaymentGuardedPatientRoute em App.tsx: `isProfessional` bypass).

# Onde
- `src/pages/InvitePatient.tsx` (UI link/whatsapp/email)
- `src/pages/PatientRegister.tsx` (validação do `code` e vínculo automático)
- `supabase/functions/send-onboarding-link/index.ts` (envio de magic link → /onboarding)
- `src/components/dashboard/PatientGridDashboard.tsx` (atalho aponta /onboarding)
- `src/pages/OnboardingPipeline.tsx` + `src/pages/Anamnesis.tsx` (anamnese embutida no fluxo)
- `src/hooks/useOnboardingGuard.ts` (libera quando plano publicado existe)
