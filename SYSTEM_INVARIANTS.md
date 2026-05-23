# 🛡️ FITJOURNEY 2.0 - SYSTEM INVARIANTS

**ESTE DOCUMENTO É A CONSTITUIÇÃO TÉCNICA DO PROJETO.**
Qualquer alteração que viole estas regras será considerada uma REGRESSÃO CRÍTICA.

## 1. SOBERANIA DO SNAPSHOT
O Snapshot V3 é a **ÚNICA** fonte de verdade para o Patient App.

- ❌ **PROIBIDO**: Calcular macros no frontend.
- ❌ **PROIBIDO**: Normalizar dados em runtime.
- ❌ **PROIBIDO**: Inferir imagens de alimentos dinamicamente no render.
- ❌ **PROIBIDO**: Placeholder ou campos `null` em dados críticos (kcal, protein, ids).
- ✅ **OBRIGATÓRIO**: `clinical_metadata` deve ser preservado entre revisões.
- ✅ **OBRIGATÓRIO**: `generated_at` e `publication_id` em cada snapshot.

## 2. MOTOR CLÍNICO (DETERMINÍSTICO)
O cálculo clínico acontece exclusivamente no Backend (Edge Functions / RPC).

- ❌ **PROIBIDO**: Motores de geração locais (frontend).
- ❌ **PROIBIDO**: Queries N+1 ao carregar planos.
- ✅ **OBRIGATÓRIO**: Mesmo input + mesmo template = mesmo Snapshot.
- ✅ **OBRIGATÓRIO**: Incremento monotônico de `revision_number`.

## 3. ARQUITETURA REALTIME
Canais Supabase devem ser estáveis e filtrados.

- ❌ **PROIBIDO**: `Date.now()` ou timestamps em nomes de canais.
- ❌ **PROIBIDO**: Canais sem filtros de segurança (RHO).
- ❌ **PROIBIDO**: Duplicação de canais para o mesmo recurso.

## 4. ANTI-LEGADO
Componentes e funções marcadas como legado não devem ser reativados.

- ❌ **PROIBIDO**: `normalizeMealPlan` (usar snapshot bruto).
- ❌ **PROIBIDO**: `calculatePrimaryTotals` no frontend.
- ❌ **PROIBIDO**: `hydrationEngine` ou `runtimeInference`.

## 5. PIPELINE DE PUBLICAÇÃO
A publicação é um ato atômico e imutável.

- ❌ **PROIBIDO**: Alterar um snapshot após ele ser marcado como `published`.
- ✅ **OBRIGATÓRIO**: Validação de integridade total antes de persistir no banco.

---
*Assinado: Arquitetura FitJourney 2.0*
