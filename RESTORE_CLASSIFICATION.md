# RESTORE_CLASSIFICATION.md — AUDITORIA CIRÚRGICA V1

Este documento classifica os componentes do sistema atual para a restauração seletiva da Experiência Original V1, preservando a evolução de infraestrutura e correções funcionais.

## 1. CONTAMINAÇÃO (PARA REMOVER/REVERTER)
*Estes itens desfiguram o V1 original ou introduzem complexidade desnecessária do V2.*

| COMPONENTE | ARQUIVO | AÇÃO | JUSTIFICATIVA |
| :--- | :--- | :--- | :--- |
| **Gateway Welcome** | `src/apps/v1/pages/Welcome.tsx` | **Remover** | Origem da tela "Quase lá...". Inexistente no V1 original. |
| **Experience Shell** | `src/apps/v1/providers/ExperienceProvider.tsx` | **Reverter** | Introduz modos basic/pro/advanced que não existiam no V1 puro. |
| **Loaders Modernos** | `src/apps/v1/components/common/PageLoader.tsx` | **Simplificar** | Reverter para o spinner CSS original. Remover "BrainLoaders". |
| **Premium Cockpit** | `src/apps/v1/pages/CockpitPremium.tsx` | **Remover** | Recurso exclusivo do V2 que contaminou o V1. |
| **App Shell Híbrido** | `src/core/app-shell/*` | **Remover** | Estrutura de bootstrap complexa que sustenta o modo V2. |
| **V1/V2 Toggles** | Múltiplos arquivos | **Remover** | Eliminar interceptações de "mode === 'v2'". |
| **Bootstrap SPA** | `src/main.tsx` | **Simplificar** | Voltar ao render direto sem inicialização de shell moderno. |

## 2. FIXES ÚTEIS E EVOLUÇÃO (PARA PRESERVAR)
*Estes itens representam progresso funcional e estabilidade de dados.*

| COMPONENTE | CATEGORIA | STATUS | JUSTIFICATIVA |
| :--- | :--- | :--- | :--- |
| **Supabase Client** | Infraestrutura | **PRESERVAR** | Conexão estável com a nuvem e tipos gerados. |
| **Auth Flow** | Funcionalidade | **PRESERVAR** | Login/Logout operacionais com as correções de segurança recentes. |
| **P2 Security Patches** | Segurança | **PRESERVAR** | Auditoria e correções de segurança (rate limit, JWKS). |
| **DB Functions** | Backend | **PRESERVAR** | Todas as RPCs e triggers no Supabase. |
| **Business Logic** | Páginas | **PRESERVAR** | Fixes de cálculo em planos, regras de substituição e CRUD de pacientes. |
| **Edge Functions** | Backend | **PRESERVAR** | Automações e integrações externas. |

## 3. INFRAESTRUTURA VÁLIDA (PARA MANTER)
- **TanStack Query:** Manter a engine, mas simplificar a configuração de retry.
- **Tailwind / Shadcn:** Manter os componentes base de UI (Button, Input, etc).
- **Hooks de Dados:** Manter `useQuery` para pacientes, refeições e planos.

## 4. O QUE DEVE VOLTAR (RESTAURAÇÃO)
- **`src/App.tsx`**: Voltará a ser o arquivo central de rotas planas (Flat Routes).
- **`src/pages/Index.tsx`**: Voltará a ser o Dashboard original (sem meta-dados de V2).
- **`src/components/layout/DashboardLayout.tsx`**: Voltará a ser o shell lateral simples original.
- **`ProtectedRoute.tsx`**: Voltará a ser o guardião de rotas simples sem verificação de "Experience Mode".

---

## CONCLUSÃO DA CLASSIFICAÇÃO
A restauração será **cirúrgica**:
1. O V1 deixará de ser uma "App" em uma subpasta (`src/apps/v1`) e voltará para a **raiz** (`src/`).
2. A estrutura de diretórios será **achatada** para refletir o estado pré-V2.
3. Todo código de orquestração de "modo" será deletado.
