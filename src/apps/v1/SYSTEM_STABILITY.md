# FitJourney - Manifesto de Estabilidade Total 🚀

Este documento define os guardiões e regras para garantir que o sistema FitJourney opere sem travamentos, telas pretas ou loops de redirecionamento.

## 1. Guardiões de Runtime

### 🛡️ Auth Safety Net (Implementado)
O `AuthProvider` agora possui um **Time-out Crítico de 12s**. Se o Supabase ou a rede falharem em inicializar a sessão, o sistema sai do estado de `loading` e entra em `error`, exibindo uma tela de recuperação clara em vez de uma tela preta infinita.

### 🛡️ Hydration Guard (Implementado)
O `useExperienceMode` agora inicializa em `loading: true`. Isso garante que o dashboard e outras rotas protegidas aguardem a sincronização do banco de dados antes de decidirem o que renderizar, eliminando flickers de permissão negada.

### 🛡️ Critical Error Boundary (Implementado)
A aplicação é envolvida por um `CriticalErrorBoundary` que captura falhas de renderização (React Crashes) e falhas de carregamento de Chunk (JS corrompido). Ele oferece um botão de "Limpeza e Reinício" que limpa o `sessionStorage`.

## 2. Regras de Ouro para Desenvolvedores

1. **PROIBIDO `return null` sem Loader**: Nunca use `if (loading) return null` em páginas. Use `<PageLoader />` ou esqueletos.
2. **Determinismo no `/welcome`**: A página de boas-vindas é o único orquestrador de destino pós-login. Nenhuma outra página deve forçar redirecionamentos de "entry-point".
3. **Versão do Bundle**: O sistema detecta se o usuário está rodando uma versão antiga do JS e força um reload se houver incompatibilidade detectada no `CoreProviders`.

## 3. Próximos Passos de Estabilidade

- [ ] **Heartbeat Monitor**: Detectar se o router não montou após 30s e sugerir reparo automático.
- [ ] **Data Persistence Check**: Validar se o `localStorage` está corrompido em dispositivos móveis.
- [ ] **Network Retry Layer**: Adicionar retentativas exponenciais para todas as chamadas críticas de perfil.

---
*Status Atual: ESTÁVEL | Monitoramento de Runtime Ativo*
