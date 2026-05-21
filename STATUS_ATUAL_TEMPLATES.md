# 🛡️ STATUS ATUAL - TEMPLATES VAZIOS (21/05/2026)

## ✅ CORREÇÃO APLICADA

### Problema Identificado
- **Sintoma**: Templates abriam mas mostravam apenas 1 alimento (ex: só "Ovo" ao invés de "Cuscuz, Ovo, Mamão")
- **Causa Raiz**: Código estava usando `m.items` mas banco tem `m.foods`
- **Estrutura no Banco**: 67 templates COM DADOS confirmados via SQL

### Solução Implementada
**Arquivo**: `src/features/editor-v3/utils/normalization.ts`
**Função**: `normalizeSnapshotToV3`
**Linha**: ~180-200

```typescript
// 🛡️ CORREÇÃO 21/05/2026: Converter foods → items
let items = m.items || [];
if (!items.length && Array.isArray(m.foods)) {
  items = m.foods.map((food: any) => ({
    id: crypto.randomUUID(),
    instanceId: crypto.randomUUID(),
    name: food.name || "Item",
    kcal: Number(food.kcal || 0),
    protein: Number(food.protein || 0),
    carbs: Number(food.carbs || food.carbohydrates || 0),
    fat: Number(food.fat || food.fats || 0),
    quantity: parseFloat(String(food.qty || food.quantity || '100').match(/[\d.]+/)?.[0] || '100'),
    clinical_mass_g: /\d+\s*(g|ml)/i.test(String(food.qty || '')) 
      ? parseFloat(String(food.qty).match(/[\d.]+/)?.[0] || '100')
      : 100,
    quantity_display: String(food.qty || food.quantity || '100g'),
    imageUrl: food.imageUrl || food.image_url || food.image || null,
    substitution_group_id: crypto.randomUUID(),
    substitutions: []
  }));
}
```

### Commit Realizado
- **Hash**: 832798177
- **Mensagem**: "fix: corrigir conversão foods → items no normalizeSnapshotToV3 - templates agora mostram todos os alimentos"
- **Branch**: fitjourney2.0
- **Status**: ✅ Push concluído para GitHub

## 📊 DADOS CONFIRMADOS NO BANCO

### Estrutura Verificada via SQL
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
              {"name": "Cuscuz", "qty": "100g", "kcal": 112},
              {"name": "Ovo", "qty": "2 unidades", "kcal": 146},
              {"name": "Mamão", "qty": "1 fatia", "kcal": 43}
            ]
          }
        ]
      }
    ]
  }
}
```

### Totais Confirmados
- **67 templates** com dados completos
- **7 dias** por template
- **4 refeições** por dia
- **3 alimentos** por refeição (em média)

## ⏳ AGUARDANDO DEPLOY

### Status do Deploy Lovable
- **Plataforma**: Lovable (no-code)
- **Trigger**: Push para GitHub (branch fitjourney2.0)
- **Tempo Estimado**: 3-5 minutos após push
- **Último Push**: Há poucos minutos (commit 832798177)

### Como Verificar se Deploy Terminou
1. Abrir aplicação em **aba anônima** (Ctrl+Shift+N)
2. Fazer login
3. Ir para Editor V3
4. Selecionar template "Emagrecimento 1500 kcal"
5. Verificar se aparecem **3 alimentos** no Café da Manhã:
   - ✅ Cuscuz 100g (112 kcal)
   - ✅ Ovo 2 unidades (146 kcal)
   - ✅ Mamão 1 fatia (43 kcal)

## 🔍 SQL PARA VERIFICAR TEMPLATES

Execute o arquivo: `VERIFICAR_TOTAL_TEMPLATES.sql`

```sql
-- Query 1: Resumo Geral
SELECT 
  COUNT(*) as total_templates,
  COUNT(*) FILTER (WHERE plan_snapshot IS NOT NULL AND plan_snapshot::text != '{}') as com_dados_completos,
  COUNT(*) FILTER (WHERE plan_snapshot IS NULL OR plan_snapshot::text = '{}') as vazios
FROM v3_diet_templates
WHERE active = true;

-- Query 2: Detalhes por Template
SELECT 
  id,
  title,
  slug,
  objective,
  CASE 
    WHEN plan_snapshot IS NULL THEN 'VAZIO'
    WHEN plan_snapshot::text = '{}' THEN 'VAZIO'
    ELSE 'COM DADOS'
  END as status,
  (SELECT COUNT(*) FROM jsonb_object_keys(plan_snapshot)) as qtd_perfis_caloricos
FROM v3_diet_templates
WHERE active = true
ORDER BY title;
```

## 🎯 PRÓXIMOS PASSOS

### Se Deploy Funcionou ✅
1. Testar template em aba anônima
2. Confirmar que aparecem todos os 3 alimentos
3. Verificar imagens (devem aparecer após hard reset)
4. Task 2 estará **CONCLUÍDA** ✅

### Se Ainda Não Funcionar ❌
1. Verificar logs do console (F12)
2. Verificar se `normalizeSnapshotToV3` está sendo chamado
3. Verificar estrutura do `snapshot` recebido
4. Ajustar conversão conforme necessário

## 📝 LOGS ADICIONADOS

### EditorV3Page.tsx
- Log em `handleSelectProfile`: Mostra snapshot recebido e meals normalizadas
- Log em `loadPlan`: Mostra início/fim do carregamento

### Verificar no Console
```javascript
// Deve aparecer:
[EditorV3] Início loadPlan {effectivePatientId: '...', effectiveId: '...'}
[EditorV3] Snapshot recebido: {...}
[EditorV3] Meals normalizadas: [...]
[EditorV3] Fim loadPlan
```

## 🛡️ ARQUITETURA SOBERANA

### Princípios Mantidos
- ✅ **Snapshot é verdade única**: Não geramos, apenas copiamos
- ✅ **Sem heurística**: Sem recálculos, sem busca dinâmica
- ✅ **Código determinístico**: Mesma entrada = mesma saída
- ✅ **Templates soberanos**: Dados vêm de `v3_diet_templates.plan_snapshot`

### Conversão Necessária
- `foods` (banco) → `items` (frontend) ✅ IMPLEMENTADO
- `image` (banco) → `imageUrl` (frontend) ✅ IMPLEMENTADO
- `qty` (string) → `clinical_mass_g` (número) ✅ IMPLEMENTADO

## 📌 ARQUIVOS MODIFICADOS

1. ✅ `src/features/editor-v3/utils/normalization.ts` - Conversão foods→items
2. ✅ `src/features/editor-v3/components/EditorV3Page.tsx` - Logs adicionados
3. ✅ `VERIFICAR_TOTAL_TEMPLATES.sql` - SQL corrigido (erro jsonb_object_keys)

## 🚨 IMPORTANTE

**SEMPRE fazer commit e push** para mudanças chegarem no Lovable!
- Lovable só atualiza quando fazemos **PUSH** para GitHub
- Não pode rodar `npm run dev` localmente
- Deploy é automático após push (3-5 minutos)
