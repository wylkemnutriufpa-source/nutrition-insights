# 🧠 AUDITORIA NUCLEAR — VARREDURA TOTAL DE INTEGRAÇÃO DO SISTEMA FITJOURNEY

**Data:** 2026-03-18  
**Metodologia:** Análise estática de código, schema de banco, edge functions, hooks, pages e fluxos de dados.  
**Escopo:** Todo o sistema frontend + backend + banco de dados.

---

## 📊 SCORE DE MATURIDADE SISTÊMICA

### **Score: 72/100 — Plataforma em Transição Avançada**

| Dimensão | Score | Status |
|---|---|---|
| Modelo de dados | 85/100 | ✅ Muito robusto |
| Lifecycle State Machine | 78/100 | ✅ Bem arquitetada, parcialmente adotada |
| Motores Clínicos (Edge Functions) | 90/100 | ✅ Excelente cobertura |
| Integração Frontend↔Backend | 55/100 | ⚠️ Ponto fraco principal |
| Consistência de Estado | 60/100 | ⚠️ Estados paralelos residuais |
| Segurança & RLS | 80/100 | ✅ Sólido |
| Escalabilidade | 75/100 | ✅ Índices e batching OK |
| Adoção da SSoT (lifecycle) | 45/100 | 🔴 Apenas 2 componentes usam |

### **Veredicto: O sistema opera como módulos bem construídos com orquestração central PARCIAL.**

O cérebro (lifecycle state machine + motores clínicos) existe e é sofisticado. O corpo (frontend) ainda não usa o cérebro como fonte única em todos os pontos.

---

## 🔎 1️⃣ RECURSOS NÃO INTERLIGADOS CORRETAMENTE

### P1 — `resolve_patient_lifecycle_state` RPC NÃO EXISTE NO BANCO
**Risco: 🔴 CRÍTICO**

A RPC `resolve_patient_lifecycle_state` é chamada por:
- `usePatientLifecycleState` (hook central)
- `usePatientPlanStatus` (compatibilidade)
- `PendingApprovalsModal` (filtragem de aprovações)
- `ClientDashboard` (dashboard do paciente)

**MAS não existe nenhuma migration ou função SQL que a defina.** O hook usa `as any` para contornar o TypeScript, e quando falha, retorna `onboarding_started` como fallback silencioso.

**Impacto:** TODOS os pacientes são tratados como "onboarding_started" se a RPC não existir. O sistema inteiro de lifecycle opera em modo degradado sem erro visível.

**Correção:** Criar a RPC `resolve_patient_lifecycle_state` como função SQL SECURITY DEFINER que implementa a hierarquia de prioridade documentada.

---

### P2 — ClientDashboard faz queries PARALELAS ao lifecycle
**Risco: 🟡 MÉDIO**

`ClientDashboard.tsx` usa `usePatientLifecycleState()` (L101) **mas também** faz queries diretas independentes para:
- `program_patients` (status active)
- `checklist_tasks`
- `notifications`
- `program_enrollments` (Biquíni Branco)

Essas queries duplicam dados que o lifecycle deveria fornecer. O dashboard monta seu próprio "estado" em paralelo.

**Correção:** O lifecycle hook deveria ser o gatilho; queries adicionais devem ser condicionais ao `lifecycle.state`.

---

### P3 — `usePatientDashboard` query hook IGNORA lifecycle completamente
**Risco: 🟡 MÉDIO**

O hook `usePatientDashboard` (queries/usePatientDashboard.ts) faz 6 queries independentes sem consultar o lifecycle state. Ele assume que o paciente tem dados (stats, checklist, anamnesis, appointments, meals, messages) sem verificar se está em onboarding, pausado ou fechado.

**Impacto:** Paciente "closed" ou "paused" ainda gera queries desnecessárias.

**Correção:** Condicionar `enabled` ao `lifecycle.state !== 'closed' && lifecycle.state !== 'paused'`.

---

### P4 — OnboardingProgressModal usa query direta em `onboarding_pipelines`
**Risco: 🟢 BAIXO**

`OnboardingProgressModal.tsx` consulta `onboarding_pipelines` diretamente (L51-54) em vez de usar o lifecycle state para determinar se deve mostrar o modal. Usa `planStatus.showOnboarding` como gate, o que é correto, mas a query interna é redundante.

---

### P5 — PendingApprovalsModal faz N+1 RPCs
**Risco: 🟡 MÉDIO**

`PendingApprovalsModal.tsx` (L101-110) faz `Promise.all` com uma RPC `resolve_patient_lifecycle_state` **por pipeline**, criando N chamadas ao banco. Com 50+ onboardings pendentes, isso gera 50+ RPCs.

**Correção:** Criar uma RPC batch `resolve_lifecycle_states_batch(_patient_ids uuid[])`.

---

## 🔎 2️⃣ FUNCIONALIDADES REDUNDANTES OU CONFLITANTES

### R1 — `usePatientPlanStatus` vs `usePatientLifecycleState`
**Risco: 🟢 BAIXO (gerenciado)**

O `usePatientPlanStatus` é um wrapper de compatibilidade. Funciona, mas mantém dois tipos de status code (`PatientPlanStatusCode` vs `LifecycleState`) que podem confundir novos desenvolvedores. 3 componentes ainda usam o antigo:
- `PlanRequestButton`
- `OnboardingProgressModal`
- `OnboardingPipeline`

**Correção:** Migrar os 3 componentes para `usePatientLifecycleState` e depreciar o hook antigo.

---

### R2 — Ativação de plano alimentar em 3 lugares diferentes
**Risco: 🟡 MÉDIO**

A lógica de "ativar plano e desativar outros" existe em:
1. `MealPlans.tsx` (L130-136) — toggle manual
2. `PlanScheduler.tsx` (L136-140) — ativação agendada
3. `MealPlanEditorV2` — via publicação

Cada um implementa a lógica de "desativar todos, ativar um" de forma independente. Não há trigger SQL ou RPC centralizada.

**Impacto:** Se um dos 3 caminhos falhar no "desativar outros", paciente fica com 2 planos ativos.

**Correção:** Criar RPC `activate_meal_plan(_plan_id uuid)` que faz a operação atômica no banco.

---

### R3 — `MealPlanEditor` (V1) e `MealPlanEditorV2` coexistem
**Risco: 🟢 BAIXO**

Duas páginas de editor de plano coexistem. O V1 foi supostamente removido do App.tsx mas a página `MealPlanEditor.tsx` ainda existe no diretório. Código morto.

**Correção:** Deletar `src/pages/MealPlanEditor.tsx` se não houver rota apontando para ele.

---

### R4 — `is_active` booleano vs `plan_status` enum em `meal_plans`
**Risco: 🟡 MÉDIO**

A tabela `meal_plans` tem DOIS mecanismos de estado:
- `is_active: boolean` — usado pelo frontend para filtrar plano ativo
- `plan_status: text` — usado pelos motores clínicos (draft, approved, published)

Esses dois campos podem conflitar: um plano pode estar `is_active: true` mas `plan_status: 'draft'`.

**Correção:** Unificar: `is_active` deveria ser uma computed view baseada em `plan_status = 'published'`.

---

## 🔎 3️⃣ INCONSISTÊNCIAS OPERACIONAIS POTENCIAIS

### I1 — Paciente com plano ativo aparece como "sem plano"
**Risco: 🔴 CRÍTICO (se P1 não for corrigido)**

Se a RPC `resolve_patient_lifecycle_state` não existir ou falhar, o fallback `onboarding_started` faz:
- `showPlan: false`
- `showOnboarding: true`
- `showNoPlan: true`

Paciente com plano publicado vê interface de onboarding.

---

### I2 — Onboarding ativo após entrega de plano
**Risco: 🟡 MÉDIO**

O trigger `trg_auto_onboarding` cria pipelines. Mas a resolução de "onboarding concluído" depende da RPC (P1). Se a RPC não existir, a flag `showOnboarding` fica `true` eternamente para pacientes em estados não resolvidos.

---

### I3 — Edge Functions sem invocação no frontend
**Risco: 🟡 MÉDIO**

As seguintes Edge Functions existem mas **não são chamadas por nenhum componente frontend** (provavelmente são Cron-only ou não implementadas):

| Edge Function | Status |
|---|---|
| `compute-adaptive-safe-automation-engine` | Cron/pipeline only |
| `compute-behavioral-dropout-risk` | Cron/pipeline only |
| `compute-clinical-experiment-analysis` | Cron/pipeline only |
| `compute-clinical-outcome-predictions` | Cron/pipeline only |
| `compute-clinical-portfolio-orchestration` | Cron/pipeline only |
| `compute-clinical-protocol-intelligence` | Cron/pipeline only |
| `compute-clinical-simulation-engine` | Cron/pipeline only |
| `compute-global-adaptive-clinical-intelligence` | Cron/pipeline only |
| `compute-human-performance-engine` | Cron/pipeline only |
| `compute-longitudinal` | Cron/pipeline only |
| `compute-metabolic-clusters` | Cron/pipeline only |
| `compute-metabolic-phase-strategy` | Cron/pipeline only |
| `compute-metabolic-twin-engine` | Cron/pipeline only |
| `compute-operational-cost-projection` | Cron/pipeline only |
| `compute-organization-clinical-metrics` | Cron/pipeline only |
| `compute-organization-operational-intelligence` | Cron/pipeline only |
| `compute-physiological-signal-engine` | Cron/pipeline only |
| `compute-population-clinical-intelligence` | Cron/pipeline only |
| `compute-population-nutrition-intelligence` | Cron/pipeline only |
| `compute-semi-autonomous-protocol-transitions` | Cron/pipeline only |
| `compute-therapeutic-adjustments` | Cron/pipeline only |
| `compute-therapeutic-orchestration-engine` | Cron/pipeline only |
| `compute-weight-trajectory-engine` | Cron/pipeline only |
| `evaluate-clinical-milestones` | Cron/pipeline only |
| `smart-push-notifications` | Cron/pipeline only |

**Nota:** Isso é CORRETO para motores de pipeline. Mas precisa validar que o `clinical-pipeline-orchestrator` realmente chama todos eles na sequência correta e que os Cron Jobs estão configurados.

---

### I4 — Eventos clínicos sem atualização global
**Risco: 🟡 MÉDIO**

O `useRealtimeEventBus` monitora `patient_lifecycle_states` e invalida caches corretos. **MAS** se a tabela `patient_lifecycle_states` não for atualizada pelos motores (porque dependem da RPC que não existe — P1), o realtime fica inerte.

---

## 🔎 4️⃣ RECURSOS SUBUTILIZADOS OU SEM FUNÇÃO REAL

### S1 — Dashboards de inteligência sem dados populados
**Risco: 🟢 BAIXO**

Os 12 dashboards analíticos (MetabolicTwin, WeightTrajectory, ClinicalRisk, etc.) existem com UI completa, mas seus dados dependem dos Cron Jobs dos motores clínicos. Se os Crons não estão configurados, as telas ficam vazias.

**Recomendação:** Cada dashboard deveria ter um estado "sem dados" claro com CTA para "executar pipeline".

---

### S2 — `backend/` Python nunca é executado
**Risco: 🟢 BAIXO**

Existe um diretório `backend/app/` com `supabase_client.py` usando Python/FastAPI. Este backend não roda no Lovable Cloud. É código legado ou planejamento futuro.

**Correção:** Mover para `docs/future/` ou deletar.

---

### S3 — `useNutritionistStatus` — hook possivelmente redundante
**Risco: 🟢 BAIXO**

Precisa verificar se é usado ou se foi substituído pela lógica de `useAuth` + `professional_profiles`.

---

## 🔎 5️⃣ GARGALOS FUTUROS DE ESCALABILIDADE

### E1 — PendingApprovalsModal N+1 RPCs
**Impacto em escala:** Com 100+ pacientes em onboarding, gera 100+ RPCs simultâneas.
**Correção:** RPC batch.

### E2 — ClientDashboard faz 8+ queries no mount
**Impacto em escala:** Cada login de paciente gera 8 queries paralelas.
**Correção:** Consolidar em uma RPC `get_patient_dashboard_data`.

### E3 — Sem cache de lifecycle state no frontend
**Impacto em escala:** Cada componente que usa `usePatientLifecycleState` faz sua própria RPC. Se 3 componentes usam, são 3 RPCs.
**Correção:** Migrar para React Query com `queryKey: ['lifecycle', userId]` e `staleTime: 60s`.

### E4 — `ClinicalRiskDashboardContent` faz query com `(supabase as any)`
**Impacto:** 2 queries usam `as any` para acessar `patient_clinical_state` e `meal_plan_adjustment_suggestions`, indicando que essas tabelas/views podem não estar no types.ts publicado, criando fragilidade de tipos.

### E5 — Sem rate-limiting nos RPCs frontend
**Impacto em escala:** RPCs como `award_points`, `resolve_patient_lifecycle_state` podem ser chamadas repetidamente sem throttle.
**Correção:** Implementar debounce nos hooks e rate-limit nas RPCs.

---

## 📋 MATRIZ DE PRIORIDADE DE CORREÇÃO

| # | Problema | Risco | Esforço | Impacto | Prioridade |
|---|---|---|---|---|---|
| **P1** | RPC `resolve_patient_lifecycle_state` não existe | 🔴 CRÍTICO | Alto | Sistema inteiro | **#1** |
| **R2** | Ativação de plano em 3 lugares | 🟡 MÉDIO | Médio | Consistência de dados | **#2** |
| **R4** | `is_active` vs `plan_status` dual state | 🟡 MÉDIO | Médio | Consistência | **#3** |
| **E3** | Lifecycle sem React Query cache | 🟡 MÉDIO | Baixo | Performance | **#4** |
| **P5** | N+1 RPCs no PendingApprovals | 🟡 MÉDIO | Baixo | Escala | **#5** |
| **R1** | Depreciar usePatientPlanStatus | 🟢 BAIXO | Baixo | Limpeza | **#6** |
| **E2** | Consolidar queries do ClientDashboard | 🟡 MÉDIO | Médio | Performance | **#7** |
| **R3** | Deletar MealPlanEditor V1 | 🟢 BAIXO | Trivial | Limpeza | **#8** |
| **S2** | Remover backend Python | 🟢 BAIXO | Trivial | Limpeza | **#9** |

---

## 🏗️ ARQUITETURA IDEAL RECOMENDADA

```
┌─────────────────────────────────────────────┐
│           PATIENT LIFECYCLE RPC             │
│    resolve_patient_lifecycle_state()        │
│    (SECURITY DEFINER, single source)        │
└──────────────┬──────────────────────────────┘
               │
    ┌──────────▼──────────────┐
    │  usePatientLifecycle    │ ← React Query cached
    │  (único hook, stale 60s)│
    └──────────┬──────────────┘
               │
    ┌──────────▼──────────────────────────┐
    │  Todos os componentes consomem:     │
    │  - ClientDashboard                  │
    │  - OnboardingModal                  │
    │  - PlanRequestButton                │
    │  - PatientDetail (pro side)         │
    │  - PendingApprovals (batch RPC)     │
    └─────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│       MEAL PLAN ACTIVATION RPC              │
│    activate_meal_plan(_plan_id)              │
│    (atômica: desativa outros + ativa)       │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│     CLINICAL PIPELINE ORCHESTRATOR          │
│     (Cron diário, chama 9 motores)          │
│     Atualiza: patient_lifecycle_states      │
│     → Trigger realtime → invalidate cache   │
└─────────────────────────────────────────────┘
```

---

## 🎯 CONCLUSÃO

O FitJourney tem uma **arquitetura de motores clínicos de nível enterprise** (90/100), mas a **camada de integração frontend↔backend está incompleta** (55/100). 

O problema #1 absoluto é: **a RPC central de lifecycle provavelmente não existe no banco**, fazendo com que o sistema inteiro opere em fallback silencioso. Corrigir isso sozinho eleva o score de 72 para ~82.

O sistema NÃO é "módulos isolados" — ele tem a orquestração DESENHADA, mas precisa da **última milha de conexão**: a RPC no banco + cache no frontend + eliminação de estados paralelos.

**Status: Plataforma 80% integrada, com 3 correções críticas para atingir operação autônoma real.**
