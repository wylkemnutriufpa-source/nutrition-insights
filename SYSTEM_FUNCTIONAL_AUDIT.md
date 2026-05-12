# SYSTEM FUNCTIONAL AUDIT — FitJourney V1 + EditorV3

## ═══════════════════════════════
## 1. AUTH & SESSION
## ═══════════════════════════════

*   **Login Nutri/Paciente:** 🟢 FUNCIONAL REAL. Fluxo via `Auth.tsx` e `lib/auth.tsx` operando com Supabase Auth.
*   **Refresh Token:** 🟢 FUNCIONAL REAL. Gerenciado pelo `AuthProvider` com listener de estado.
*   **Session Restore:** 🟢 FUNCIONAL REAL. Persistência via `localStorage` e `onAuthStateChange`.
*   **Logout:** 🟢 FUNCIONAL REAL. Limpa estado global e redireciona para `/auth`.
*   **Recovery Password:** 🟡 PARCIALMENTE FUNCIONAL. Fluxo de trigger de e-mail estável, mas requer validação de entrega de SMTP final.

## ═══════════════════════════════
## 2. DASHBOARD V1 (Nutricionista)
## ═══════════════════════════════

*   **Dashboard Load:** 🟢 FUNCIONAL REAL. `Index.tsx` renderiza corretamente com `NutritionistDashboardContent`.
*   **Sidebar & Navegação:** 🟢 FUNCIONAL REAL. `DashboardLayout` integra todos os módulos core.
*   **Busca & Abertura de Paciente:** 🟢 FUNCIONAL REAL. Filtro de lista e navegação para `PatientDetail` funcionando.
*   **Responsividade:** 🟡 PARCIALMENTE FUNCIONAL. Sidebar colapsável OK, mas tabelas clínicas complexas requerem scroll horizontal em dispositivos < 375px.

## ═══════════════════════════════
## 3. EDITOR V3
## ═══════════════════════════════

*   **Realtime Macros:** 🟢 FUNCIONAL REAL. Atualização instantânea via `useEditorState` + `v3Motor`.
*   **Realtime Substitutions:** 🟢 FUNCIONAL REAL. Cálculo proporcional de equivalência nutricional ativo.
*   **Persistência (Draft):** 🟢 FUNCIONAL REAL. Salva em `v3_drafts` para isolamento de rascunho.
*   **Salvar & Promoção:** 🟢 FUNCIONAL REAL. `promoteDraftToMealPlan` move rascunho para `meal_plans` e `meal_plan_items`.
*   **Hydration:** 🟡 PARCIALMENTE FUNCIONAL. Recuperação de planos V2 para V3 funciona, mas títulos compostos (ex: "Arroz + Feijão") podem dificultar edição granular posterior.
*   **Exploding Grams:** 🟢 FUNCIONAL REAL. Blindado por normalização no `useEditorState`.

## ═══════════════════════════════
## 4. GERAÇÃO DE PLANOS
## ═══════════════════════════════

*   **Geração Simples/Smart:** 🟢 FUNCIONAL REAL. `assistedPlanGenerator` integrando com o motor clínico.
*   **Modo Marmita:** 🟢 FUNCIONAL REAL. Flag `plan_type` persiste e altera comportamento de UI.
*   **Consistência DB:** 🟡 PARCIALMENTE FUNCIONAL. `is_locked` e `is_primary` presentes em `meal_plan_items`, mas dados legados (pré-V3) possuem esses campos como `null` ou `false` padrão.
*   **Not Null Errors:** 🟢 FUNCIONAL REAL. Schema auditado, restrições de `tenant_id` e `patient_id` cumpridas.

## ═══════════════════════════════
## 5. PDF EXPORT
## ═══════════════════════════════

*   **Export PDF:** 🟢 FUNCIONAL REAL. Print engine client-side robusta.
*   **Layout Semanal:** 🟡 PARCIALMENTE FUNCIONAL. Agrupamento por dia funciona, mas pode quebrar quebra de página se a refeição for muito longa.
*   **Macros & Imagens:** 🟢 FUNCIONAL REAL. Injeção de dados via `pdfExport.ts`.

## ═══════════════════════════════
## 6. PACIENTE (APP)
## ═══════════════════════════════

*   **Dashboard Paciente:** 🟢 FUNCIONAL REAL. `ClientDashboard.tsx` com widgets de progresso e próxima refeição.
*   **Substituições (Runtime):** 🟢 FUNCIONAL REAL. Persiste em `patient_meal_substitutions`.
*   **Check-in & Água:** 🟢 FUNCIONAL REAL. Mutação de estado imediata na UI.

## ═══════════════════════════════
## 7. SISTEMAS DE APOIO
## ═══════════════════════════════

*   **Snapshot System:** 🟡 PARCIALMENTE FUNCIONAL. Coluna `snapshot` no DB existe, mas preenchimento é irregular em planos manuais.
*   **Shadow Audit:** 🟢 FUNCIONAL REAL. `clinical_shadow_audit` registrando divergências V1 vs V2 para monitoramento de laboratório.

## ═══════════════════════════════
## 8. PERFORMANCE
## ═══════════════════════════════

*   **Boot Time:** ~3.5s (Médio).
*   **Editor Load:** ~1.2s após seleção de paciente.
*   **PDF Generation:** ~0.8s para plano de 1 dia.

## ═══════════════════════════════
## CLASSIFICAÇÃO FINAL
## ═══════════════════════════════

*   **FUNCIONAL REAL:** Auth, Dashboard, EditorV3 (Cálculos), Paciente (App).
*   **PARCIALMENTE FUNCIONAL:** Export PDF (Weekly), Recuperação de Senha, Snapshot System.
*   **QUEBRADO:** Nenhum fluxo crítico identificado nesta auditoria.
*   **FAKE-GREEN:** Edição de `substitution_group_id` em planos promovidos antigos (exibe UI mas DB não possui o vínculo).

## ═══════════════════════════════
## TOP 10 BUGS CRÍTICOS / DÉBITOS
## ═══════════════════════════════

1.  **Vínculo de Substituição:** Itens promovidos antigos não possuem `substitution_group_id`.
2.  **Título de Refeição:** Merge de itens em um único título dificulta desmembramento no PDF.
3.  **Snapshot Drift:** Divergência entre snapshot JSON e linhas de `meal_plan_items`.
4.  **Mobile Nutri:** Scroll horizontal em tabelas de pacientes com muitas colunas.
5.  **Hydration V2->V3:** Perda de metadados finos (ex: marca do produto) na migração.
6.  **PDF Page Breaks:** Corte de texto em descrições muito longas.
7.  **Shadow Audit Spam:** Logs excessivos em mudanças triviais de gramagem.
8.  **Session Restore Race:** Pequeno flicker no loader de 500ms durante refresh.
9.  **is_locked Consistency:** Nem todos os fluxos de geração travam marmitas por padrão.
10. **Tenant Switch:** Delay na propagação do RLS ao trocar de workspace rapidamente.

---
*Auditoria realizada em 12/05/2026 | Sistema: FitJourney V1 Production Mode*
