#!/bin/bash

# FitJourney — Auditoria Automática de Soberania V3
# Detecta padrões proibidos que ameaçam a estabilidade determinística.

echo "════════════════════════════════════════════════════════════════"
echo "  AUDITORIA DE SOBERANIA V3 — BLINDAGEM OPERACIONAL"
echo "════════════════════════════════════════════════════════════════"

FORBIDDEN_PATTERNS=(
  "normalizeV2ToV3"
  "foodNormalization.ts"
  "normalizeFood"
  "recalculateMacros"
  "BASE_FOODS"
  "Math.random"
)

WARNING_PATTERNS=(
  "RegExp"
  "\.match\("
  "\.replace\("
  "assume"
  "infer"
)

echo "[1/3] Verificando Padrões Proibidos (BOMBA RELÓGIO)..."
for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  echo -n "Checking for $pattern... "
  COUNT=$(rg "$pattern" src/features src/services src/lib --ignore-file src/lib/LEGACY_INVENTORY.md | wc -l)
  if [ "$COUNT" -gt 0 ]; then
    echo "❌ FALHA: $COUNT ocorrências encontradas!"
    rg -n "$pattern" src/features src/services src/lib --ignore-file src/lib/LEGACY_INVENTORY.md
  else
    echo "✅ LIMPO"
  fi
done

echo ""
echo "[2/3] Verificando Padrões de Risco (MUTADOR SILENCIOSO)..."
for pattern in "${WARNING_PATTERNS[@]}"; do
  echo -n "Checking for $pattern... "
  COUNT=$(rg "$pattern" src/features src/services src/lib --ignore-file src/lib/LEGACY_INVENTORY.md | wc -l)
  if [ "$COUNT" -gt 0 ]; then
    echo "⚠️ AVISO: $COUNT ocorrências suspeitas."
  else
    echo "✅ LIMPO"
  fi
done

echo ""
echo "[3/3] Verificando Integridade de Snapshots..."
if [ -f "src/lib/snapshot/zodSchema.ts" ]; then
  echo "✅ Zod Schema presente."
else
  echo "❌ ERRO: Zod Schema ausente!"
fi

echo "════════════════════════════════════════════════════════════════"
echo "  AUDITORIA CONCLUÍDA"
echo "════════════════════════════════════════════════════════════════"
