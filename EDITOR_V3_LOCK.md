# EDITOR V3 LOCK — ESTABILIZAÇÃO OPERACIONAL

## ══════════════════════════════════════════════════════════════════
## STATUS: CONGELADO (LOCKDOWN)
## ÚLTIMA ATUALIZAÇÃO: 12/05/2026
## MOTIVO: Separação definitiva entre Edição e Motor
## ══════════════════════════════════════════════════════════════════

## 1. RESPONSABILIDADES DO EDITOR
O Editor V3 é estritamente uma camada de **Visualização e Edição**.
- NÃO realiza cálculos clínicos complexos.
- NÃO altera as regras de distribuição de macros.
- NÃO muta dados persistidos sem passar pelo `dispatch`.

## 2. FLUXO OFICIAL DE DADOS
1. **Hydration**: Dados chegam via `hydrateMeals` -> passam pelo `normalizeMeals`.
2. **Display**: Quantidades são convertidas para unidades amigáveis (ovos, colheres) apenas para visualização.
3. **Persistence**: Ao salvar, o `clinical_mass_g` é preservado para garantir integridade.

## 3. TRANSFORMAÇÕES PROIBIDAS (ANTI-DRIFT)
- É proibido criar fatores de escala que mutem o estado global fora do `useEditorState`.
- É proibido ignorar o `clinical_mass_g` em favor da `quantity` de exibição durante cálculos nutricionais.

## 4. PONTOS CRÍTICOS DE CONTROLE
- `useEditorState.ts`: O `dispatch` centralizado com rollback automático é o único ponto de entrada para mutações.
- `EditorV3Page.tsx`: Deve respeitar o `clinicalMode` para garantir que as travas estejam ativas.

## 5. REGRAS ANTI-CASCATA
- Modais (Substitution, Adjustment) devem operar em cópias locais antes de fazer o commit para o store global.
- Falhas em contratos de dados devem disparar `Rollback` imediato do estado.
