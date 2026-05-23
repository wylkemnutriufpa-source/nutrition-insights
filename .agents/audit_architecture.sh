#!/bin/bash

# 🛡️ ARCHITECTURE AUDIT - FITJOURNEY 2.0
# Bloqueio de Regressão Autônoma

echo "🔍 Iniciando Auditoria de Arquitetura Soberana..."

# 1. Denylist de Símbolos Proibidos
echo "--- Verificando Símbolos Proibidos ---"
DENY_SYMBOLS=("calculatePrimaryTotals" "normalizeMealPlan" "hydrationEngine" "runtimeInference" "mealPlanNormalizer" "mealPlanDisplay" "calculateMacros" "fixCorruptedData" "inferMacrosFromName" "rebuildSnapshot")

for symbol in "${DENY_SYMBOLS[@]}"; do
    FOUND=$(rg -l "$symbol" src/ --exclude src/lib/sovereign/)
    if [ ! -z "$FOUND" ]; then
        echo "❌ VIOLAÇÃO: Símbolo proibido '$symbol' encontrado em:"
        echo "$FOUND"
    fi
done

# 2. Denylist de Arquivos Proibidos
echo "--- Verificando Arquivos de Regressão ---"
DENY_FILES=("src/components/MealPlanBuilder.tsx" "src/components/MealPlanEditor.tsx")

for file in "${DENY_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "❌ VIOLAÇÃO: Arquivo de regressão detectado: $file"
    fi
done

# 3. Verificando Padrões de Cálculo no Frontend
echo "--- Verificando Cálculos de Macros no Frontend ---"
rg -e "kcal.*reduce" -e "protein_g.*reduce" src/ --exclude src/lib/sovereign/

# 4. Verificando Sinais de "Healing" Silencioso
echo "--- Verificando Healing Silencioso ---"
rg "catch.*healing" src/ -i

echo "✅ Auditoria Concluída."
