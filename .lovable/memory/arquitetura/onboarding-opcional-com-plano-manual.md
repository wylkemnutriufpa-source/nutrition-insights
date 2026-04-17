---
name: Onboarding opcional quando profissional entrega plano manual
description: Onboarding (anamnese/dados/preferências) só é obrigatório quando o paciente depende da geração automatizada. Se profissional entregou plano manual, gate libera.
type: feature
---

# Regra
- `useOnboardingGuard` libera (`requirement="none"`) imediatamente se existir `meal_plans` em status: published, published_to_patient, approved, active, delivered para o paciente (todos os IDs resolvidos via `resolvePatientIdentity`).
- Pipeline de onboarding só bloqueia o paciente quando `release_status = 'released'` E não há plano entregue.
- Realtime: hook escuta `meal_plans` por `patient_id` para revalidar instantaneamente quando profissional publica.

# Motivação
Profissional precisa entregar plano direto sem ficar travado pelo onboarding automatizado. Anamnese/dados continuam disponíveis (rotas em `ONBOARDING_ALLOWED_ROUTES`) mas não são forçadas.

# Onde
- `src/hooks/useOnboardingGuard.ts`
- `src/App.tsx` PaymentGuardedPatientRoute consome `requirement`.
