# ROUTE_AUDIT.md — Auditoria Forense de Rotas

## Estado Atual vs Original (FitJourney V1)

| Rota Original (569c57fd9) | Rota Atual | Status | Ação |
|---------------------------|------------|--------|------|
| /landing | /landing | ✅ Mantida | - |
| /auth | /auth | ✅ Mantida | - |
| /reset-password | /reset-password | ✅ Mantida | - |
| / | / | ✅ Mantida | - |
| /chat | /chat | 🔴 Ausente | Restaurar |
| /appointments | /appointments | 🔴 Ausente | Restaurar |
| /patients | /patients | ✅ Mantida | - |
| /patient/:id | /patient/:id | 🔴 Ausente | Restaurar |
| /checkin-panel | /checkin-panel | 🔴 Ausente | Restaurar |
| /automation | /automation | 🔴 Ausente | Restaurar |
| /meal-plans | /meal-plans | ✅ Mantida | - |
| /meal-plans/:id | /meal-plans/:id | 🔴 Ausente | Restaurar |
| /diet-templates | /diet-templates | 🔴 Ausente | Restaurar |
| /recipes | /recipes | 🔴 Ausente | Restaurar |
| /food-database | /food-database | 🔴 Ausente | Restaurar |
| /reports | /reports | 🔴 Ausente | Restaurar |
| /weekly-report | /weekly-report | 🔴 Ausente | Restaurar |
| /weekly-goals | /weekly-goals | 🔴 Ausente | Restaurar |
| /financial | /financial | 🔴 Ausente | Restaurar |
| /supplements | /supplements | 🔴 Ausente | Restaurar |
| /global-tips | /global-tips | 🔴 Ausente | Restaurar |
| /feedbacks | /feedbacks | 🔴 Ausente | Restaurar |
| /branding | /branding | 🔴 Ausente | Restaurar |
| /protocols | /protocols | 🔴 Ausente | Restaurar |
| /programs | /programs | 🔴 Ausente | Restaurar |
| /program/:id | /program/:id | 🔴 Ausente | Restaurar |
| /biquini-branco/:id | /biquini-branco/:id | 🔴 Ausente | Restaurar |
| /anamnesis | /anamnesis | 🔴 Ausente | Restaurar |
| /physical-assessment | /physical-assessment | 🔴 Ausente | Restaurar |
| /body-analysis | /body-analysis | 🔴 Ausente | Restaurar |
| /notifications | /notifications | 🔴 Ausente | Restaurar |
| /clinical-intelligence | /clinical-intelligence | 🔴 Ausente | Restaurar |
| /admin | /admin | 🔴 Ausente | Restaurar |
| /settings | /settings | ✅ Mantida | - |
| /my-diet | /my-diet | 🔴 Ausente | Restaurar |
| /analyze | /analyze | ✅ Mantida | - |
| /checklist | /checklist | 🔴 Ausente | Restaurar |
| /checkin | /checkin | 🔴 Ausente | Restaurar |
| /shopping-list | /shopping-list | 🔴 Ausente | Restaurar |
| /journey | /journey | 🔴 Ausente | Restaurar |
| /library | /library | 🔴 Ausente | Restaurar |
| /weight-calculator | /weight-calculator | 🔴 Ausente | Restaurar |
| /water-calculator | /water-calculator | 🔴 Ausente | Restaurar |
| /health-quiz | /health-quiz | 🔴 Ausente | Restaurar |
| /autobot | /autobot | 🔴 Ausente | Restaurar |

## Observações Forenses:
- **Branding:** O nome original "FitJourney" foi preservado no DashboardLayout histórico. Qualquer menção a "NutriFlow" deve ser removida.
- **Estrutura:** O App.tsx atual possui uma lista drasticamente reduzida de rotas, quebrando a navegação original.
- **Divergência Crítica:** A rota `/v1/welcome` relatada pelo usuário não existia no commit original (569c57fd9), sugerindo uma criação arbitrária recente.
