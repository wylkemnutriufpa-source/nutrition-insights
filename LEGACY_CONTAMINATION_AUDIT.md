# LEGACY CONTAMINATION AUDIT — PROTEÇÃO V3

## ══════════════════════════════════════════════════════════════════
## OBJETIVO: Eliminar interferência do Legado (V2/V1) no Motor V3
## STATUS: AUDITORIA CONCLUÍDA
## ══════════════════════════════════════════════════════════════════

## 1. PONTOS DE CONTAMINAÇÃO IDENTIFICADOS E BLINDADOS
- **Measurement Converters**: Os conversores antigos do V2 foram isolados. O V3 usa seu próprio `normalization.ts`.
- **Hydration V2**: A função `normalizeV2ToV3` atua como uma zona de quarentena (DMZ).
- **Quantity Remappers**: Removidos mapeadores implícitos que mutavam o estado global em hooks de UI.

## 2. AUDITORIA DE ADAPTERS
- ✅ `useEditorState`: Blindado contra mutations do legado.
- ✅ `localPlanGenerator`: Agora usa exclusivamente o motor determinístico V3.
- ✅ `pdfService`: Utiliza o `PipelineTrace` para garantir que o que sai no PDF é o que está no estado clínico.

## 3. RISCOS RESIDUAIS (LISTA REAL)
1. **Substitutions Legadas**: Alguns alimentos no banco de dados ainda possuem formatos de substituição do V2 que podem tentar burlar o `ClinicalGuard`.
2. **Conversões de Unidade**: Alimentos muito exóticos (ex: "uma pitada", "um punhado") podem ter `portionValue` inconsistentes, gerando visualização estranha (embora a massa clínica permaneça segura).

## 4. AÇÃO RECOMENDADA
- Manter o `ClinicalGuard.clampQuantity` sempre ativo no fim de cada normalização.
- NUNCA remover o log de `VIOLAÇÃO/ERRO` do `dispatch` do Store.
