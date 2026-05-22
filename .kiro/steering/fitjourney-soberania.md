---
inclusion: always
---

# 🛡️ REGRAS SOBERANAS DO FITJOURNEY 2.0

## 🚨 REGRA #1 — SEMPRE COMMITAR E PUSH (Lovable Sync)

**O Lovable só atualiza quando fazemos PUSH para o GitHub.**

Após CADA mudança em código (.ts, .tsx, .sql, .md), o fluxo OBRIGATÓRIO é:

```bash
git add -A
git commit --no-verify -m "descrição clara do que foi feito"
git push origin fitjourney2.0
```

### Regras Absolutas
- ✅ SEMPRE branch `fitjourney2.0` (NUNCA main/master)
- ✅ SEMPRE `--no-verify` (hook husky pode bloquear)
- ✅ Mensagens em português, descritivas, sem emojis no comando
- ✅ Se push for rejected: `git pull origin fitjourney2.0 --no-rebase` e tentar de novo
- ❌ NUNCA acumular mudanças sem commit (problema de ontem)
- ❌ NUNCA usar `git push origin main` ou `master`

---

## 🛡️ REGRA #2 — SOBERANIA ARQUITETURAL

O FitJourney 2.0 é uma **SNAPSHOT-FIRST PLATFORM**:

- **Frontend**: RENDERIZA (não pensa)
- **Backend**: COMPILA (no save-time)
- **Templates**: CONGELAM (imutáveis)
- **Snapshot**: VERDADE ÚNICA

### ❌ PROIBIDO no Frontend
- Heurística (regex inferindo refeição)
- Cálculo de macros (`reduce`, `sum`, `calculate`)
- Hydration runtime
- Normalização silenciosa
- Fallback "inteligente"
- Reconstrução de snapshot
- Inferência dinâmica de qualquer tipo

### ✅ PERMITIDO no Frontend
- Renderização passiva de snapshot
- Leitura de campos do snapshot
- Formatação visual (CSS, layout)
- Navegação entre dias/refeições
- Exibição de totais já calculados (`snapshot.daily_totals`)

---

## 🗃️ REGRA #3 — ESTRUTURA DE DADOS DO BANCO

### Templates V3 (`v3_diet_templates`)
```json
{
  "1500": {
    "days": [
      {
        "day_of_week": 1,
        "meals": [
          {
            "name": "Café da Manhã",
            "time": "08:00",
            "type": "cafe",
            "image": "https://...jpg",
            "foods": [
              {"name": "Cuscuz", "qty": "100g", "kcal": 112}
            ]
          }
        ]
      }
    ]
  }
}
```

### Conversão Backend → Frontend
- `foods` (banco) → `items` (frontend)
- `image` (banco) → `imageUrl` (frontend)
- `qty` ("100g", "2 unidades") → `clinical_mass_g` (número)

---

## 🎯 REGRA #4 — FLUXO DE TRABALHO PADRÃO

### Ao Editar Código
1. Ler arquivo relevante antes
2. Fazer mudança específica e mínima
3. Verificar erros com `getDiagnostics`
4. Commitar imediatamente
5. Push para `fitjourney2.0`
6. Aguardar 3-5 min para Lovable deploy

### Ao Encontrar Bug
1. NÃO assumir, ler o código real
2. Verificar dados no banco (SQL) se necessário
3. Identificar causa raiz (não patch incremental)
4. Aplicar correção soberana (sem heurística)
5. Commitar com mensagem clara

### Ao Receber Erros do Console
- Compilados minificados (`index-XXX.js`) → commit ainda não chegou no deploy
- Aguardar 3-5 min ou pedir hard reset (Ctrl+Shift+R)
- Testar em aba anônima (Ctrl+Shift+N) para garantir cache limpo

---

## 📊 REGRA #5 — DADOS CONFIRMADOS

- **67 templates** com dados completos
- **62 templates** integrados via migration soberana V3
- **7 dias** completos por template
- **4 refeições** por dia (média)
- **3 alimentos** por refeição (média)
- Branch ativa: `fitjourney2.0`
- Plataforma: **Lovable** (no-code, sync via GitHub)

---

## 🔪 REGRA #6 — ARQUIVOS LEGADOS A REMOVER (FASE 1 EXCISÃO)

### 🔴 Para Deletar
- `src/lib/legacy/mealPlanDisplay.ts` (motor de cálculo no frontend)
- `src/lib/legacy/mealPlanNormalizer.ts` (normalização legada V1/V2)

### 🟡 Para Refatorar (remover imports legados)
- `src/pages/PatientMealPlan.tsx` ✅ (FASE 1 feita)
- `src/components/patient/PatientProfileMealPlan.tsx`
- `src/components/patient/ExpandableMealPlanCard.tsx`
- `src/components/patient/DailyMealPlanInline.tsx`
- `src/lib/pdfExportPremium.ts`

---

## 🎯 META FINAL

Qualquer snapshot salvo deve abrir **IGUAL** em:
- ✅ Editor V3
- ✅ Patient App
- ✅ PDF
- ✅ WhatsApp
- ✅ Exportação

**SEM nenhuma diferença.**

**Snapshot é o Destino.**
