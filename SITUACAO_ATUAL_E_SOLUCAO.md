# 🚨 SITUAÇÃO ATUAL - TEMPLATES VAZIOS NO EDITOR V3

## 📊 STATUS ATUAL

### ✅ O QUE JÁ FOI FEITO

1. **Edge Function Restaurada** ✅
   - `supabase/functions/generate-meal-plan/index.ts` foi restaurada
   - Função usa arquitetura soberana (snapshot como verdade única)

2. **Código de Normalização Corrigido** ✅
   - `src/features/editor-v3/utils/normalization.ts` foi modificado
   - Função `normalizeSnapshotToV3` agora lê corretamente `snapshot.days`
   - Conversão `foods → items` implementada
   - Logs de debug adicionados

3. **Dados no Banco Verificados** ✅
   - 67 templates COM DADOS confirmados via SQL
   - Estrutura: `{ "1500": { "days": [...] } }`

### ❌ O QUE AINDA NÃO FUNCIONA

1. **Templates Aparecem Vazios** ❌
   - Apenas 1 item aparece (ex: só "Ovo")
   - Deveria aparecer: "Cuscuz 100g", "Ovo 2 unidades", "Mamão 1 fatia"
   - Sem imagens das refeições

2. **Logs Não Aparecem** ❌
   - Logs `[normalizeSnapshotToV3]` não aparecem no console
   - Isso indica que o código novo ainda não está sendo executado

---

## 🔍 DIAGNÓSTICO DO PROBLEMA

### HIPÓTESE 1: Deploy do Lovable Ainda Não Terminou

**Sintomas:**
- Logs `[normalizeSnapshotToV3]` não aparecem
- Código antigo ainda está sendo executado

**Solução:**
1. Aguardar deploy do Lovable terminar (pode levar 2-5 minutos)
2. Limpar cache do navegador completamente
3. Abrir aba anônima e testar novamente

### HIPÓTESE 2: Estrutura do Snapshot Divergente

**Sintomas:**
- Logs aparecem mas templates ainda vazios
- Conversão `foods → items` não está funcionando

**Solução:**
1. Executar `DIAGNOSTICO_COMPLETO.sql` no Supabase
2. Verificar estrutura REAL do `plan_snapshot`
3. Ajustar código de normalização conforme estrutura real

### HIPÓTESE 3: Problema na Query de Busca

**Sintomas:**
- Templates aparecem na lista mas sem dados
- `plan_snapshot` não está sendo retornado pela query

**Solução:**
1. Verificar se `DietTemplateService.listTemplates()` retorna `plan_snapshot`
2. Adicionar log para ver o que está sendo retornado

---

## 🎯 PRÓXIMOS PASSOS (EM ORDEM)

### PASSO 1: Verificar se Deploy Terminou ⏳

**Como verificar:**
1. Abra o console do navegador (F12)
2. Vá na aba "Console"
3. Limpe o console (ícone 🚫)
4. Clique em "Biblioteca" no Editor V3
5. Selecione um template
6. Escolha perfil calórico
7. Clique em "Plotar Template"

**O que você DEVE ver:**
```
[EditorV3] Snapshot recebido: {...}
[normalizeSnapshotToV3] ========== INÍCIO ==========
[normalizeSnapshotToV3] Input snapshot: {...}
[normalizeSnapshotToV3] ✅ Estrutura BANCO: snapshot.days (CORRETO)
[normalizeSnapshotToV3] rawMeals extraídos: 42 refeições
[normalizeSnapshotToV3] ✅ Convertendo 3 foods para items
[normalizeSnapshotToV3] Convertendo food: Cuscuz 100g 112
[normalizeSnapshotToV3] Convertendo food: Ovo 2 unidades 146
[normalizeSnapshotToV3] Convertendo food: Mamão 1 fatia 43
[normalizeSnapshotToV3] ========== FIM ==========
```

**Se NÃO ver esses logs:**
- Deploy ainda não terminou
- Aguarde mais 2-3 minutos
- Limpe cache e tente novamente

**Se ver esses logs:**
- Deploy terminou! ✅
- Vá para PASSO 2

---

### PASSO 2: Verificar Estrutura do Banco 🔍

**Execute este SQL no Supabase:**

```sql
-- Copie e cole no SQL Editor do Supabase
SELECT 
  title,
  plan_snapshot->'1500'->'days'->0->'meals'->0 as primeira_refeicao
FROM v3_diet_templates
WHERE title = 'Emagrecimento 1500 kcal'
  AND active = true;
```

**Resultado esperado:**
```json
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
```

**Se o resultado for diferente:**
- Me envie o resultado EXATO
- Vou ajustar o código de normalização

---

### PASSO 3: Verificar Conversão foods → items 🔄

**Se os logs aparecem mas templates ainda vazios:**

1. Verifique se os logs mostram:
   ```
   [normalizeSnapshotToV3] ✅ Convertendo X foods para items
   ```

2. Se NÃO mostrar essa linha:
   - Significa que `m.foods` está vazio ou não existe
   - Execute o SQL do PASSO 2 para verificar estrutura

3. Se mostrar essa linha mas items ainda vazios:
   - Problema está na conversão
   - Verifique se `imageUrl` está sendo mapeado corretamente

---

## 🛠️ SOLUÇÕES RÁPIDAS

### Solução 1: Limpar Cache Completamente

**Windows (Chrome/Edge):**
1. Pressione `Ctrl + Shift + Delete`
2. Marque:
   - ✅ Cookies e dados de sites
   - ✅ Imagens e arquivos em cache
3. Período: "Todo o período"
4. Clique em "Limpar dados"

**OU use aba anônima:**
1. Pressione `Ctrl + Shift + N`
2. Acesse o sistema
3. Faça login
4. Teste os templates

---

### Solução 2: Forçar Rebuild no Lovable

**Se o deploy não terminar:**
1. Faça uma mudança mínima no código (adicione um espaço)
2. Salve o arquivo
3. Aguarde novo deploy
4. Limpe cache e teste

---

### Solução 3: Verificar Logs do Lovable

**Se nada funcionar:**
1. Abra o painel do Lovable
2. Vá em "Logs" ou "Console"
3. Procure por erros de build
4. Me envie os erros se houver

---

## 📋 CHECKLIST DE VERIFICAÇÃO

Marque conforme for testando:

- [ ] Deploy do Lovable terminou
- [ ] Cache do navegador limpo
- [ ] Aba anônima testada
- [ ] Logs `[normalizeSnapshotToV3]` aparecem no console
- [ ] SQL `DIAGNOSTICO_COMPLETO.sql` executado
- [ ] Estrutura do banco verificada
- [ ] Templates aparecem com TODOS os itens
- [ ] Imagens das refeições aparecem
- [ ] Gramagens aparecem corretas (100g, 2 unidades, etc)
- [ ] Calorias aparecem corretas

---

## 🚨 SE NADA FUNCIONAR

**Me envie:**

1. **Print do console (F12)** mostrando os logs
2. **Print da tela do Editor V3** mostrando os templates
3. **Resultado do SQL** `DIAGNOSTICO_COMPLETO.sql`
4. **Logs do Lovable** se houver erros de build

Com essas informações, vou conseguir identificar o problema exato e corrigir.

---

## 📊 ARQUITETURA ESPERADA

### Fluxo Correto:

```
1. Usuário clica em "Biblioteca"
   ↓
2. DietTemplateService.listTemplates() busca templates do banco
   ↓
3. Retorna templates com plan_snapshot
   ↓
4. Usuário seleciona template e perfil calórico (ex: 1500 kcal)
   ↓
5. handleSelectProfile extrai snapshot[1500]
   ↓
6. normalizeSnapshotToV3(snapshot) converte para formato do Editor
   ↓
7. Conversão:
   - snapshot.days → array de dias
   - day.meals → array de refeições
   - meal.foods → meal.items (conversão)
   - food.qty → item.clinical_mass_g (parsing)
   - food.image → item.imageUrl (mapeamento)
   ↓
8. store.hydrateMeals(meals) carrega no estado
   ↓
9. MealCard renderiza refeições com TODOS os itens
```

### Onde Pode Estar Quebrando:

- ❌ **Passo 2:** Query não retorna `plan_snapshot`
- ❌ **Passo 5:** Snapshot não tem chave "1500"
- ❌ **Passo 6:** Estrutura do snapshot divergente
- ❌ **Passo 7:** Conversão `foods → items` falhando
- ❌ **Passo 9:** Renderização mostrando apenas 1 item

---

**Última atualização:** 21/05/2026 15:30  
**Status:** 🟡 AGUARDANDO VERIFICAÇÃO DO USUÁRIO

