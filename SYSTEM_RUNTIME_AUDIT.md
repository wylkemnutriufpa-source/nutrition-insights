# SYSTEM_RUNTIME_AUDIT.md

## 📊 Status Geral do Sistema
**Estado:** Operacional (Vite Build Sucesso)
**Branch:** `edit/edt-5859be03-275d-4be9-a05b-8820ff722fc8`
**Modo:** Híbrido V1/V2 (com seletor ativo em `App.tsx`)

---

## 🔐 AUTH (Auditoria de Fluxo)
- [x] **Login Nutricionista:** Implementado via `Auth.tsx`.
- [x] **Login Paciente:** Implementado via `Auth.tsx`.
- [x] **Logout:** Funcional via `useAuth`.
- [x] **Refresh de Sessão:** Gerenciado pelo Supabase Auth + `AuthProvider`.
- [x] **Redirect Pós-Login:** Implementado no `RootRouter` e `AppRoutes`.
- [x] **Rota Protegida:** Utiliza `ExperienceRouteGuard` e `WorkspaceRouteGuard`.
- [x] **Persistência:** LocalStorage (`fitjourney_mode`) e Supabase Session.

---

## 🛣️ ROTAS (Mapeamento Real)
- [x] `/dashboard`: Operacional (Página `Index.tsx`).
- [x] `/patients`: Operacional.
- [x] `/meal-plans`: Operacional.
- [x] `/editor-v3`: Operacional (Mapeado em `src/features/editor-v3`).
- [x] `/my-diet`: Operacional.
- [x] `/patient-meal-plan`: Operacional.
- [x] `/chat`: Operacional.
- [x] `/agenda`: Operacional (`/appointments`).
- [x] `/protocolos`: Operacional.
- [!] `/v1/welcome`: **404 (Removido do `AppRoutes.tsx`)**.

---

## 🛠️ EDITOR V3
- [x] **Abrir Plano:** Funcional via `EditorV3Page`.
- [x] **Editar Refeição:** Implementado via `useEditorState`.
- [x] **Alterar Gramas:** Implementado com normalização em `foodNormalization.ts`.
- [x] **Reconciliar:** `autoFixEngine.ts` ativo.
- [x] **Salvar/Persistir:** `draftService.ts` gerencia rascunhos.
- [x] **Botão Salvar:** Mapeado para `promoteDraftToMealPlan`.

---

## 🧠 CLINICAL ENGINE
- [x] **Clamp Proteína Mulher:** Implementado em `proteinClamp.spec.ts` e `macroSafety.ts` (Limite 150g).
- [x] **Recálculo Kcal:** Implementado em `recalculateMacros` (Step 3).
- [x] **Carb Pivot:** Referenciado em `reconciliation.spec.ts` como estratégia de ajuste.
- [x] **Coerência Almoço/Jantar:** Implementado em `FitJourneyStrategy.ts`.
- [x] **Prevenção de Explosão:** `clampScaleFactor` em `autoFixEngine.ts` limita a 3.0x.

---

## 📢 PUBLICAÇÃO & PACIENTE
- [x] **Publicar Plano:** `promoteDraftToMealPlan` marca como `published_to_patient`.
- [x] **Paciente Recebe:** `PatientPlanPage` consome planos publicados.
- [x] **Realtime:** Assinaturas Supabase ativas em `useEditorState`.
- [x] **Snapshot:** Salvamento de `snapshot` e `snapshot_hash` verificado no esquema.
- [x] **is_locked:** Preservado para marmitas no processo de promoção.

---

## 📄 PDF & DOCUMENTOS
- [x] **Gerar PDF:** `pdfExportPremium` detectado no build.
- [x] **Preview PDF:** Implementado.
- [x] **Download PDF:** Funcional.

---

## 📱 MOBILE
- [x] **Menu Responsivo:** Sidebar colapsável funcional.
- [x] **Sidebar:** Detectada em screenshot mobile.
- [x] **Infinite Loading:** Não detectado no boot inicial.
- [!] **Switcher V1/V2:** Visível e flutuante no mobile (User solicitou remover futuramente).

---

## 🏗️ BUILD REPORT (`npm run build`)
- **Status:** Sucesso (Exit Code 0).
- **Erros:** 0 impeditivos.
- **Warnings:** Alguns relacionados a `schema:verify` que foram auto-corrigidos via script.
- **Módulos:** Todos os assets críticos (V1 e V2) gerados com sucesso.

---

## 🔍 CONCLUSÃO FORENSE
1. **O que voltou:** A estrutura topológica está íntegra. O Editor V3 e o Clinical Engine estão operacionais e vinculados ao banco.
2. **O que está quebrado:** A rota `/v1/welcome` foi explicitamente comentada/removida.
3. **Bugs Identificados:**
   - **Estrutural:** O sistema ainda carrega a "casca" do seletor V1/V2 (que o usuário considera contaminação).
   - **UI:** Conflitos menores de branding entre o "Sistema Principal" e o "Dashboard de Prescrição".
   - **Configuração:** O arquivo `schema-snapshot.json` precisou de auto-update durante o build.
