# FitJourney System Stability Policy

Este documento define os princípios de arquitetura para manter o sistema FitJourney estável e evitar quebras globais (White Screen of Death).

## 1. Independência de Camadas (Sandboxing)
- **Providers Isolados**: Nunca coloque lógica pesada ou que possa falhar no `CoreProviders` sem um Error Boundary específico.
- **Sectional Boundaries**: Use `<SectionalErrorBoundary name="NomeDaSecao">` ao redor de componentes grandes (Sidebar, Main Content, Editores). Se um quebrar, o resto do app sobrevive.
- **Lazy Loading**: Use `lazy()` para páginas. Se um chunk falhar ao carregar, o `CriticalErrorBoundary` detectará e forçará um reload limpo.

## 2. Hooks Resilientes (Safe Hooks)
- **Bootloader Detection**: Hooks como `useAuth` e `useAppState` devem ser consumidos via `useSafeContext` ou retornar estados de "carregamento" ou "seguro" se o provider estiver ausente, em vez de crashar.
- **ensureContext**: Use apenas quando a ausência do contexto for um erro fatal e irrecuperável que requer intervenção do desenvolvedor.

## 3. Fluxo de Boot Protegido
- **Watchdog Timer**: O `SystemShield` monitora se o app "travou" em um estado de loading infinito por mais de 10 segundos.
- **Diagnostic Screen**: Se o boot falhar, mostramos uma tela de diagnóstico interativa com opção de "Limpar Cache e Sair".

## 4. Regras para Edição de Estrutura
- **App.tsx**: Quase nunca deve ser editado. Ele é o ponto de montagem fixo.
- **CoreProviders.tsx**: Ordem de nesting importa. Providers de dados (QueryClient) > Infra (Router) > Segurança (Auth) > Estado App.
- **AppRoutes.tsx**: Agrupe rotas por domínio e proteja cada grupo com um Error Boundary.

## 5. Detecção Precoce
- **GlobalErrorBoundary**: Escuta eventos de erro customizados (`fj-runtime-error`) para exibir toasts de aviso antes que o sistema todo apresente falha.

---
*FitJourney Stability Core v1.0*
