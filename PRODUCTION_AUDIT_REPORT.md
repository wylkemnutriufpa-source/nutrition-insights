# 🛡️ OPERAÇÃO: PRODUCTION SHIELD — RELATÓRIO FINAL DE AUDITORIA

## 1. Mapa REAL de Gargalos
- **[CRÍTICO] Tempestade de Refetch**: O sistema utiliza um método "nuclear" de invalidação (`invalidateCriticalQueries`). Uma única alteração dispara até 15 queries simultâneas por usuário. Em escala (100+ pacientes), isso derruba o Supabase.
- **[CRÍTICO] Churn de Realtime**: Detectado 572.000+ inserts na tabela `realtime.subscription`. Isso indica que os canais estão abrindo e fechando freneticamente (loop de re-mount de hooks).
- **[ALTO] Latência de Boot (FCP 7s)**: O bundle carrega `three.js`, `jspdf` e `xlsx` no caminho crítico. Usuários em 4G levam 10+ segundos para ver a tela de login.
- **[MÉDIO] Waterfall de Dados**: `Index.tsx` e `PatientDetail` buscam dados de forma sequencial em vez de usar uma única View ou Join otimizado.

## 2. Top 10 Riscos de Produção
1. **Loop de Rollback**: 536.877 transações revertidas detectadas. Indica erro lógico ou violação de RLS em massa.
2. **Erro de RLS em Notificações**: Nutritionists falham ao notificar pacientes por falha na resolução de `tenant_id`.
3. **Estouro de Payload**: Listagem de planos baixa snapshots inteiros (JSONs gigantes) em vez de apenas metadados.
4. **Race Conditions no Editor V3**: O auto-save pode colidir com o "Publish" em conexões lentas.
5. **Vazamento de Memória em Realtime**: Hooks de realtime capturam instâncias antigas do `queryClient`.
6. **Deadlock de Trigger**: A cadeia `Status -> Pontos -> Ranking` é síncrona e pesada.
7. **Insegurança de Tipagem Runtime**: O sistema ainda faz "healing" (cura) de dados no frontend.
8. **Crash de Viewport Mobile**: Editor V3 usa `calc(100vh)` que quebra com a barra do Safari iOS.
9. **Exaustão de Conexões**: O alto volume de queries por componente pode exaurir o pool do PgBouncer.
10. **Zumbi de useEffect**: 373 hooks detectados; muitos sem cleanup adequado ou com dependências instáveis.

## 3. Top 10 Otimizações Imediatas (Plano Cirúrgico)
1. **[DADOS]** Implementar `select('id, title, status')` em listagens (Remover o `*`).
2. **[AUTH]** Corrigir a trigger `auto_resolve_tenant_notifications` para evitar erro de RLS.
3. **[PERF]** Lazy-load de `three.js`, `jspdf` e `xlsx` (importação dinâmica).
4. **[PERF]** Trocar `invalidateQueries` amplo por `invalidateQueries({ queryKey: [..., id] })`.
5. **[SYNC]** Estabilizar `useNutritionistRealtime` para evitar o churn de 572k assinaturas.
6. **[UX]** Implementar indicador visual de "Offline/Syncing" no Patient App.
7. **[UI]** Trocar `100vh` por `100svh` (Small Viewport Height) para mobile.
8. **[CLEAN]** Remover `useAutoTemplateSeeder` (Cura de dados em runtime é proibida).
9. **[DB]** Criar Índices faltantes em `checklist_tasks(user_id, status)`.
10. **[ENGINE]** Mover cálculos de macros do frontend para o `planPersistenceService` (Backend-first).

---

## 4. Veredito Final (Sem Maquiagem)

- **Grau de Estabilidade**: **7/10** (Sólido funcionalmente, mas frágil sob carga simultânea).
- **Grau de Performance**: **5/10** (O "tempo até interativo" é inaceitável para uma ferramenta de uso diário).
- **Grau de Escalabilidade**: **4/10** (A arquitetura de snapshots JSONB e refetch nuclear não aguenta 1.000 usuários ativos).
- **Maior Gargalo Atual**: O **Churn de Realtime** e a **Invalidação Nuclear**.
- **O que precisa MORRER**: A mentalidade de "o frontend conserta o dado se estiver errado" (Healing Logic).
- **O que ficou Profissional**: O **Snapshot V3 Soberano** e o **Fluxo de Onboarding**.

**Status**: O FitJourney 2.0 é um tanque de guerra com um motor de Fusca. A blindagem estrutural está pronta, mas o sistema de propulsão (dados/realtime) precisa de retífica imediata.

---

# 🚀 PRÓXIMOS PASSOS: EXECUÇÃO DA BLINDAGEM DE PRODUÇÃO

Iniciando agora a correção dos 3 gargalos críticos (Rollbacks, RLS Notificações e Churn Realtime).
