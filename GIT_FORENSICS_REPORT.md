# GIT_FORENSICS_REPORT.md — ANÁLISE FORENSE DE REPOSITÓRIO

## 1. ESTADO ATUAL DO RUNTIME
- **Branch Atual:** `edit/edt-928cd78d-354a-4efc-b0ab-9ff31d4a7977` (Checkout efetuado hoje, 12/Mai)
- **Base de Origem:** `projeto-fase-3-lovable`
- **Working Tree:** `CLEAN` (Nenhuma alteração local pendente)

## 2. MAPA DE BRANCHES EXISTENTES
- `projeto-fase-3-lovable` (Local/Origin): Estado atual híbrido. Contém a estrutura "flat" (restaurada), mas com drift de código.
- `remotes/origin/fitjourney2.0`: **FONTE DE CONTAMINAÇÃO.** Contém `BrainLoader.tsx` e infraestrutura V2/Clínica.
- `remotes/origin/fix/estabilizacao-editor-v3`: Branch de correção pontual.
- `remotes/origin/lovable-backup-fitjourney2.0-1778534575`: Backup de segurança do estado V2.

## 3. TIMELINE DE COMMITS CRÍTICOS
- **12/Mai (Hoje) — `771ac6d66`**: Commit atual (Fast Visual Edit).
- **08/Abr — `7da95f0ea`**: "Congelou plano sistema v1.0.0". Este é o marco de "congelamento" oficial do V1.
- **10/Mar — `569c57fd9`**: "Preceding changes". Identificado como o **Golden V1** (Estado original puro sem Clinical Engine).

## 4. DIAGNÓSTICO DE BRANCH DRIFT
O sistema encontra-se em estado **Frankenstein** por divergência de rotas e diretórios:
- **Rotas:** O `App.tsx` atual utiliza rotas planas (ex: `/auth`), enquanto componentes como `QuickLink.tsx` ainda referenciam `/v1/auth` e `/v1/welcome`.
- **404 Detectado:** O erro em `/v1/welcome` ocorre porque o arquivo `src/apps/v1/pages/Welcome.tsx` foi removido na tentativa de "achatamento" da estrutura, mas os links não foram atualizados.
- **Arquitetura Fantasma:** O diretório `src/apps` foi deletado, mas as referências a ele ainda existem em documentos de classificação e em caminhos de importação quebrados.

## 5. LOCALIZAÇÃO DE CONTAMINAÇÕES (CLASSIFICAÇÃO)

| ITEM | STATUS NO BRANCH ATUAL | BRANCH DE ORIGEM |
| :--- | :--- | :--- |
| **NutriFlow** | Não encontrado (Removido ou Revertido) | Desconhecido / Drift |
| **BrainLoader** | Removido (Mas links para /v1 persistem) | `fitjourney2.0` |
| **ClinicalEngineV2** | Removido da estrutura de pastas | `fitjourney2.0` |
| **AppRouter Moderno** | Revertido para `BrowserRouter` simples | `projeto-fase-3-lovable` |
| **Splash/Quase lá** | Inexistente (Arquivo Welcome deletado) | `projeto-fase-3-lovable` |
| **fitjourney_mode** | Resquícios em `QuickLink.tsx` (localStorage) | `projeto-fase-3-lovable` |

## 6. CONCLUSÃO FORENSE
O repositório sofreu um **restore seletivo incompleto**. 
1. A estrutura de arquivos foi movida de volta para a raiz (`src/`), mas o código interno (links, navegação, lógica de boot) ainda espera a estrutura `/v1` ou `/v2`.
2. O "Clinical Engine" e o "BrainLoader" foram removidos fisicamente, mas a lógica de navegação do V1 original foi corrompida no processo, resultando nos erros de runtime (404).
3. **Ponto de Recuperação:** Para um restore literal sem contaminação, o alvo é o commit **`569c57fd9`**, porém ele carece dos fixes de backend/infra dos últimos 2 meses.

## 7. AÇÕES RECOMENDADAS (BLOQUEADAS CONFORME REGRA)
- Identificar todos os hardcoded `/v1/` e removê-los.
- Reconciliar o `QuickLink.tsx` com as rotas reais do `App.tsx`.
- Limpar `localStorage` de chaves `fj_` que forçam comportamentos híbridos.
