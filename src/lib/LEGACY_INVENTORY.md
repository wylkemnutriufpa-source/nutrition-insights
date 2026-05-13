# INVENTÁRIO DE LEGADO NUTRICORE (AUDITORIA FASE 5)

Este documento classifica os módulos legados para isolamento ou remoção, visando a soberania total do Motor V3.

## 1. REMOVER (Obsoletos/Destrutivos)
- `src/lib/nutricore_v2/unit-converter.ts`: Substituído pela gramagem clínica explícita do V3.
- `src/lib/nutricore_v2/recalculateMacros.ts`: (Se existir como arquivo separado) Toda re-calculação deve ocorrer no V3 Motor ou ser consumida do snapshot.
- `normalizeFood` (Heurísticas de V2): Não deve mais ser usado para "adivinhar" macros de strings.

## 2. ISOLAR (Manter apenas para Planos V1/V2)
- `src/lib/nutricore_v2/helpers.ts`: `calculateItemMacros` e `getSubstitutionsWithGrams` devem ser movidos para um namespace `legacy` e chamados apenas se `editor_version !== 'v3'`.
- `src/lib/nutricore_v2/portion-display.ts`: `resolveDisplayGrams` e `formatDisplayPortion` agora possuem guardas para V3, mas devem ser eventualmente movidos para o motor clínico.
- `dedupeGroups` e `selectCanonicalDayItems` em `src/lib/mealPlanDisplay.ts`: Isolados para não corromperem o snapshot flat do V3.

## 3. MANTER TEMPORARIAMENTE (Pontes de Transição)
- `src/lib/nutricore_v2/food-database.ts`: Usado como fallback quando o snapshot V3 não contém dados de substituição (embora agora desabilitado na UI do paciente V3).
- `patient_meal_substitutions` (Tabela): Mantida para persistir escolhas do paciente, mas operando sobre IDs soberanos do V3.

## 4. LEGADO/ZUMBI (Identificados como Sabotadores)
- Heurísticas de regex em `description`: Substituídas por `display_quantity` e `display_unit`.
- Agregadores de macro no frontend: Substituídos pela soma passiva de targets do snapshot.
