# CLINICAL ENGINE LOCK — ESTABILIZAÇÃO SOBERANA V3

## ══════════════════════════════════════════════════════════════════
## STATUS: CONGELADO (LOCKDOWN)
## ÚLTIMA ATUALIZAÇÃO: 12/05/2026
## MOTIVO: Blindagem contra explosão matemática e drift clínico
## ══════════════════════════════════════════════════════════════════

## 1. ARQUIVOS PROTEGIDOS (FROZEN)
Qualquer alteração nestes arquivos exige validação de regressão clínica:
- `src/features/editor-v3/utils/normalization.ts` (O Guardião do Pipeline)
- `src/features/editor-v3/utils/pipeline-trace.ts` (A Prova Forense)
- `src/features/clinical-engine/services/v3Motor.ts` (O Cérebro Determinístico)

## 2. REGRAS INVIOLÁVEIS (THE CLINICAL CONSTITUTION)
1. **Soberania da Massa Clínica**: O campo `clinical_mass_g` é a única fonte da verdade imutável. 
2. **Proibição de Mutação**: O `normalization.ts` não deve alterar a massa clínica após o congelamento inicial.
3. **Clamping Obrigatório**: Todo output do motor deve passar pelo `ClinicalGuard.clampQuantity`.

## 3. LIMITES FISIOLÓGICOS (SAFETY LIMITS)
- **Gramas**: Max 800g por item individual.
- **Líquidos (ml)**: Max 1000ml por item individual.
- **Unidades**: Max 20 unidades.
- **Colheres**: Max 40 colheres.
- **Proteína**: Max 150g por item.

## 4. CONTRATOS DE DADOS
- O `normalization.ts` DEVE garantir que `kcal`, `protein`, `carbs` e `fat` nunca sejam `NaN` ou `undefined` (default 0).
- O mapeamento `V2 -> V3` é unidirecional e deve ser validado pelo `Migration Guard`.

## 5. AUDITORIA DE EXECUÇÃO
Todo ciclo de vida do dado deve ser registrado no `PipelineTrace` para auditoria forense em caso de regressão.
