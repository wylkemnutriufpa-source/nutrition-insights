# 🛡️ MAPA DA BLINDAGEM ARQUITETURAL - FITJOURNEY 2.0

Este documento descreve o sistema de proteção contra regressões estruturais e autonomia indevida do agente Lovable.

## 1. COMPONENTES DA BLINDAGEM

| Componente | Função | Arquivo |
| :--- | :--- | :--- |
| **Steering Files** | Instruções globais que o Lovable deve ler em cada turno. | `.agents/STEERING.md` |
| **Architecture Locks** | Travas de runtime que impedem execução de lógica proibida. | `src/lib/sovereign/lock.ts` |
| **Invariant Assertions** | Validações rigorosas de integridade de dados (V3). | `src/lib/sovereign/invariantAssertions.ts` |
| **Denylist Engine** | Bloqueio de símbolos, arquivos e padrões legados. | `src/lib/sovereign/sovereignRules.ts` |
| **Passive Renderer** | Componente que força o fluxo Snapshot → Render. | `src/components/sovereign/SovereignRenderer.tsx` |
| **Audit Script** | Ferramenta de verificação de violações por Regex. | `.agents/audit_architecture.sh` |

## 2. ARQUIVOS PROTEGIDOS (DOMÍNIOS SOBERANOS)

Modificações nestes arquivos são restritas e devem seguir a constituição técnica:
- `SYSTEM_INVARIANTS.md` (Constituição)
- `src/lib/sovereign/*` (Motor de Proteção)
- `supabase/functions/clinical-engine/*` (Único lugar de cálculo clínico)
- `.agents/*` (Instruções de sistema)

## 3. COMPORTAMENTOS BLOQUEADOS

- ❌ **Recálculo de Macros**: Proibido usar `.reduce()` ou somas manuais no frontend.
- ❌ **Healing Silencioso**: Proibido tentar "corrigir" dados corrompidos no render.
- ❌ **Inferência Visual**: Proibido deduzir propriedades de alimentos pelo nome.
- ❌ **Hydration Tardia**: Proibido completar dados do plano após o carregamento inicial.
- ❌ **Normalização Runtime**: Proibido transformar dados V2/V1 em V3 no frontend.

## 4. SISTEMA DE ENFORCEMENT (COMO FUNCIONA)

1. **Estático (TypeScript)**: O uso de símbolos na `LEGACY_DENYLIST` gera erros de importação ou alertas.
2. **Dinâmico (Runtime)**: `ArchitectureLock.enforce()` e `SovereignRenderer` lançam exceções se a regra for quebrada.
3. **Auditoria (CLI)**: O script `.agents/audit_architecture.sh` detecta se o Lovable introduziu código proibido via Regex.

## 5. ESTRATÉGIA DEFINITIVA PARA O LOVABLE

O Lovable agora opera sob o contrato de **Renderizador Passivo**:
1. **INPUT**: Recebe um Snapshot V3 soberano do Supabase.
2. **VALIDAÇÃO**: `SovereignRenderer` valida a integridade total.
3. **RENDER**: Transforma o JSON em UI sem alterar uma única vírgula dos dados.
4. **SYNC**: Mantém a UI atualizada via Realtime Soberano.

Qualquer tentativa de "ser inteligente" ou "consertar a arquitetura" resultará em falha do sistema.
