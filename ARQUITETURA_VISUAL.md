# 🏗️ Arquitetura Visual - Defense in Depth

## Visão Geral do Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENTE (React)                                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ CAMADA 3: Client State Isolation                                │  │
│  │ ┌────────────────────────────────────────────────────────────┐  │  │
│  │ │ Zustand Store + Immer                                      │  │  │
│  │ │ - Single source of truth                                   │  │  │
│  │ │ - Optimistic updates                                       │  │  │
│  │ │ - Rollback em erro                                         │  │  │
│  │ │ - Validação em cada ação                                   │  │  │
│  │ └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                        (HTTP Request com Zod)
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                        SERVIDOR (Node.js)                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ CAMADA 2: API Contracts                                          │  │
│  │ ┌────────────────────────────────────────────────────────────┐  │  │
│  │ │ Validação com Zod                                          │  │  │
│  │ │ - Validar entrada                                          │  │  │
│  │ │ - Validar saída                                            │  │  │
│  │ │ - Type-safe em runtime                                     │  │  │
│  │ │ - Fail fast com erro claro                                 │  │  │
│  │ └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  │ ┌────────────────────────────────────────────────────────────┐  │  │
│  │ │ Serviços (mealPlanService, foodService, etc)               │  │  │
│  │ │ - Lógica de negócio                                        │  │  │
│  │ │ - Verificação de permissões                                │  │  │
│  │ │ - Chamadas ao banco                                        │  │  │
│  │ └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  │ ┌────────────────────────────────────────────────────────────┐  │  │
│  │ │ Transações Seguras (withTransaction)                       │  │  │
│  │ │ - Retry com backoff exponencial                            │  │  │
│  │ │ - Fallback automático                                      │  │  │
│  │ │ - Rollback em erro                                         │  │  │
│  │ │ - Logging detalhado                                        │  │  │
│  │ └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                        (SQL com Constraints)
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      BANCO DE DADOS (PostgreSQL)                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ CAMADA 1: Database Contracts                                     │  │
│  │ ┌────────────────────────────────────────────────────────────┐  │  │
│  │ │ Migrações Versionadas                                      │  │  │
│  │ │ - Schema formal                                            │  │  │
│  │ │ - Tipos corretos                                           │  │  │
│  │ │ - Indexes estratégicos                                     │  │  │
│  │ └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  │ ┌────────────────────────────────────────────────────────────┐  │  │
│  │ │ Constraints                                                │  │  │
│  │ │ - Foreign Keys (ON DELETE CASCADE/SET NULL)                │  │  │
│  │ │ - CHECK (validações de negócio)                            │  │  │
│  │ │ - UNIQUE (sem duplicatas)                                  │  │  │
│  │ │ - NOT NULL (campos obrigatórios)                           │  │  │
│  │ └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  │ ┌────────────────────────────────────────────────────────────┐  │  │
│  │ │ Auditoria                                                  │  │  │
│  │ │ - Tabela audit_log                                         │  │  │
│  │ │ - Triggers para rastrear mudanças                          │  │  │
│  │ │ - Histórico completo de operações                          │  │  │
│  │ └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Dados: Criar Plano de Refeição

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. CLIENTE: Usuário preenche formulário                                 │
│    - Nome do plano                                                      │
│    - Data de início                                                     │
│    - Metas de macros                                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. CAMADA 3: Validação no Cliente                                       │
│    - Verificar campos obrigatórios                                      │
│    - Validar tipos                                                      │
│    - Mostrar erro se inválido                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. CAMADA 3: Optimistic Update                                          │
│    - Atualizar store imediatamente                                      │
│    - Mostrar UI otimista                                                │
│    - Guardar backup para rollback                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. CAMADA 2: Enviar para API                                            │
│    - POST /api/meal-plans                                               │
│    - Body: { patientId, title, startDate, targets }                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. CAMADA 2: Validação no Servidor                                      │
│    - Zod valida entrada                                                 │
│    - Se inválido: retorna erro 400 com detalhes                         │
│    - Se válido: continua                                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 6. CAMADA 2: Verificação de Permissões                                  │
│    - Verificar que nutricionista existe                                 │
│    - Verificar que paciente existe                                      │
│    - Verificar que estão no mesmo tenant                                │
│    - Se falhar: retorna erro 403                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 7. CAMADA 1: Executar em Transação                                      │
│    - BEGIN TRANSACTION                                                  │
│    - INSERT INTO meal_plans (...)                                       │
│    - Se erro: ROLLBACK                                                  │
│    - Se sucesso: COMMIT                                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 8. CAMADA 1: Constraints do Banco Validam                               │
│    - FK: patient_id existe em profiles?                                 │
│    - CHECK: status é válido?                                            │
│    - UNIQUE: (patient_id, version) é único?                             │
│    - Se falhar: erro do banco, ROLLBACK                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 9. CAMADA 2: Validar Resposta                                           │
│    - Zod valida estrutura da resposta                                   │
│    - Se inválido: erro 500                                              │
│    - Se válido: retorna para cliente                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 10. CAMADA 3: Atualizar Store com Resposta                              │
│     - Confirmar optimistic update                                       │
│     - Ou fazer rollback se resposta diferente                           │
│     - Atualizar UI com dados confirmados                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 11. CLIENTE: Mostrar Sucesso                                            │
│     - Toast: "Plano criado com sucesso"                                 │
│     - Redirecionar para editor                                          │
│     - Logging de auditoria                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tratamento de Erros: Cascata de Proteção

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ERRO: Dados Inválidos (ex: UUID inválido)                               │
├─────────────────────────────────────────────────────────────────────────┤
│ CAMADA 3: Validação no Cliente                                          │
│ ✓ Detecta erro                                                          │
│ ✓ Mostra mensagem clara: "ID do paciente inválido"                      │
│ ✓ Não envia para servidor                                               │
│ ✓ Não faz optimistic update                                             │
│ ✓ Usuário pode corrigir e tentar novamente                              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ERRO: Permissão Negada (ex: nutricionista não existe)                   │
├─────────────────────────────────────────────────────────────────────────┤
│ CAMADA 2: Validação no Servidor                                         │
│ ✓ Detecta erro                                                          │
│ ✓ Retorna erro 403 com mensagem clara                                   │
│ ✓ Não toca no banco de dados                                            │
│ ✓ CAMADA 3: Rollback do optimistic update                               │
│ ✓ Mostra erro para usuário                                              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ERRO: Constraint Violada (ex: patient_id não existe)                    │
├─────────────────────────────────────────────────────────────────────────┤
│ CAMADA 1: Banco de Dados                                                │
│ ✓ Detecta violação de FK                                                │
│ ✓ ROLLBACK automático                                                   │
│ ✓ Nada é inserido no banco                                              │
│ ✓ CAMADA 2: Retorna erro 400                                            │
│ ✓ CAMADA 3: Rollback do optimistic update                               │
│ ✓ Mostra erro para usuário                                              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ERRO: Timeout (ex: banco demorando)                                     │
├─────────────────────────────────────────────────────────────────────────┤
│ CAMADA 1: Transação com Retry                                           │
│ ✓ Detecta timeout                                                       │
│ ✓ Retry automático (até 2x)                                             │
│ ✓ Backoff exponencial (1s, 2s)                                          │
│ ✓ Se falhar: Fallback opcional                                          │
│ ✓ Se tudo falhar: Erro claro para usuário                               │
│ ✓ CAMADA 3: Rollback do optimistic update                               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Estrutura de Arquivos

```
src/
├── lib/
│   ├── validation/
│   │   ├── schemas.ts              ← Schemas Zod (CAMADA 2)
│   │   └── validateRequest.ts      ← Middleware de validação (CAMADA 2)
│   │
│   ├── safeTransaction.ts          ← Transações seguras (CAMADA 1)
│   │
│   ├── api/
│   │   ├── mealPlanService.ts      ← Exemplo: Criar/Publicar plano
│   │   ├── foodService.ts          ← Adicionar alimento (a criar)
│   │   ├── substitutionService.ts  ← Criar substituição (a criar)
│   │   └── adherenceService.ts     ← Registrar aderência (a criar)
│   │
│   ├── monitoring.ts               ← Logging e auditoria
│   └── ...
│
├── stores/
│   ├── mealPlanStore.ts            ← Store com Zustand (CAMADA 3)
│   ├── patientStore.ts             ← Store de paciente (a criar)
│   └── ...
│
├── features/
│   └── editor-v3/
│       ├── hooks/
│       │   └── useEditorState.ts   ← Store do editor (a refatorar)
│       └── ...
│
└── __tests__/
    └── e2e/
        ├── mealPlanFlow.test.ts    ← Testes E2E
        ├── foodFlow.test.ts        ← Testes E2E (a criar)
        └── ...

db/
├── migrations/
│   ├── 001_initial_schema.sql      ← Schema inicial (a criar)
│   ├── 002_add_constraints.sql     ← Constraints (a criar)
│   └── 003_add_audit_tables.sql    ← Auditoria (a criar)
└── ...
```

---

## Matriz de Responsabilidades

| Camada | Responsabilidade | Arquivo | Status |
|--------|------------------|---------|--------|
| **CAMADA 3** | Validação no cliente | `src/stores/` | ⏳ A fazer |
| **CAMADA 3** | Optimistic updates | `src/stores/` | ⏳ A fazer |
| **CAMADA 3** | Rollback em erro | `src/stores/` | ⏳ A fazer |
| **CAMADA 2** | Validação com Zod | `src/lib/validation/schemas.ts` | ✅ Feito |
| **CAMADA 2** | Middleware de validação | `src/lib/validation/validateRequest.ts` | ✅ Feito |
| **CAMADA 2** | Serviços com validação | `src/lib/api/mealPlanService.ts` | ✅ Feito |
| **CAMADA 2** | Verificação de permissões | `src/lib/api/` | ⏳ A fazer |
| **CAMADA 1** | Transações seguras | `src/lib/safeTransaction.ts` | ✅ Feito |
| **CAMADA 1** | Retry com backoff | `src/lib/safeTransaction.ts` | ✅ Feito |
| **CAMADA 1** | Fallback automático | `src/lib/safeTransaction.ts` | ✅ Feito |
| **CAMADA 1** | Migrações SQL | `db/migrations/` | ⏳ A fazer |
| **CAMADA 1** | Constraints | `db/migrations/` | ⏳ A fazer |
| **CAMADA 1** | Auditoria | `db/migrations/` | ⏳ A fazer |

---

## Legenda

- ✅ Feito
- ⏳ A fazer
- 🔄 Em progresso

---

## Próximas Etapas

1. **Hoje**: Ler documentação
2. **Semana 1**: Implementar CAMADA 1 (Database Contracts)
3. **Semana 2**: Implementar CAMADA 2 (API Contracts)
4. **Semana 3**: Implementar CAMADA 3 (Client State)
5. **Semana 4**: Testes e monitoramento

---

## Conclusão

A arquitetura de **Defense in Depth** com 3 camadas garante que:

✅ Erros são detectados o mais cedo possível
✅ Dados nunca ficam inconsistentes
✅ Recuperação é automática
✅ Auditoria é completa
✅ Ciclos de consertos em cascata são impossíveis
