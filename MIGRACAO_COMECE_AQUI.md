# 🚀 MIGRAÇÃO DE PACIENTES — COMECE AQUI

## 📋 O QUE VOCÊ PRECISA FAZER

Você vai usar **Lovable com suas credenciais** para criar uma **Edge Function** que migra dados do Supabase antigo para o novo.

---

## 📚 DOCUMENTOS CRIADOS

Leia nesta ordem:

### 1️⃣ **`MIGRACAO_O_QUE_MUDOU.md`** (5 min)
Explica por que o prompt anterior era flawed e o que foi corrigido.

**Leia se:** Quer entender os problemas técnicos (RLS, auth.users, service_role keys)

---

### 2️⃣ **`COMO_OBTER_SERVICE_ROLE_KEYS.md`** (10 min)
Passo-a-passo para obter as service_role keys de ambos os projetos.

**Leia se:** Precisa obter as chaves (você vai precisar!)

---

### 3️⃣ **`MIGRACAO_GUIA_COMPLETO.md`** (15 min)
Guia completo com 4 perguntas críticas e passo-a-passo para enviar prompt ao Lovable.

**Leia se:** Quer instruções detalhadas de como proceder

---

### 4️⃣ **`MIGRACAO_CHECKLIST.md`** (referência)
Checklist para acompanhar progresso durante a migração.

**Use:** Para marcar o que já foi feito

---

### 5️⃣ **`PROMPT_MIGRACAO_LOVABLE.md`** (copiar e colar)
Prompt corrigido para enviar ao Lovable.

**Use:** Copie e cole no chat do Lovable (após substituir placeholders)

---

## ⚡ QUICK START (5 PASSOS)

Se você já entende o contexto, aqui está o resumo rápido:

### Passo 1: Obtenha as Service_role Keys
- Supabase Antigo (`vkrcobprntictsxqmjjl`): Settings → API → Service Role Key
- Novo Supabase (`bhyyxrllhmisxyobbgfn`): Settings → API → Service Role Key

### Passo 2: Responda as 4 Perguntas
1. Tenho ambas as service_role keys? ✅
2. Escopo: Opção A (minimalista) ou B (completo)? → **Recomendado: A**
3. Auth.users: Opção A (sem migração) ou B (manual)? → **Recomendado: A**
4. Confirmo projetos: origem `vkrcobprntictsxqmjjl`, destino `bhyyxrllhmisxyobbgfn`? ✅

### Passo 3: Envie Prompt ao Lovable
- Abra Lovable com suas credenciais
- Copie `PROMPT_MIGRACAO_LOVABLE.md`
- Substitua os placeholders de service_role keys
- Cole no chat do Lovable

### Passo 4: Teste com dryRun=true
```bash
supabase functions serve migrate-patients

# Em outro terminal:
curl -X POST http://localhost:54321/functions/v1/migrate-patients \
  -H "Content-Type: application/json" \
  -d '{
    "sourceServiceRoleKey": "eyJ...",
    "destServiceRoleKey": "eyJ...",
    "dryRun": true
  }'
```

### Passo 5: Execute Migração Real (dryRun=false)
```bash
curl -X POST http://localhost:54321/functions/v1/migrate-patients \
  -H "Content-Type: application/json" \
  -d '{
    "sourceServiceRoleKey": "eyJ...",
    "destServiceRoleKey": "eyJ...",
    "dryRun": false
  }'
```

---

## 🎯 RESULTADO ESPERADO

Após completar:

✅ Todos os pacientes aparecem no novo Supabase
✅ Todos os planos aparecem com dados corretos
✅ Integridade referencial mantida
✅ Usuários conseguem fazer login no novo projeto
✅ Nenhum dado foi perdido
✅ Pronto para fazer deploy no Vercel

---

## 📊 PROJETOS

| Aspecto | Valor |
|---------|-------|
| **Supabase Antigo (Origem)** | `vkrcobprntictsxqmjjl` |
| **Novo Supabase (Destino)** | `bhyyxrllhmisxyobbgfn` |
| **Tabelas a Migrar** | `patients`, `meal_plans`, `meal_plan_items` |
| **Edge Function** | `supabase/functions/migrate-patients/index.ts` |

---

## ⚠️ IMPORTANTE

- **Service_role keys são sensíveis** — Nunca compartilhe
- **Nunca coloque no `.env` do frontend** — Apenas em Edge Functions
- **Teste com dryRun=true primeiro** — Não insere dados
- **Valide no novo Supabase** — Confirme que dados foram migrados

---

## 🚀 PRÓXIMO PASSO

1. Leia `MIGRACAO_O_QUE_MUDOU.md` para entender os problemas corrigidos
2. Leia `COMO_OBTER_SERVICE_ROLE_KEYS.md` para obter as chaves
3. Leia `MIGRACAO_GUIA_COMPLETO.md` para instruções detalhadas
4. Use `MIGRACAO_CHECKLIST.md` para acompanhar progresso
5. Copie `PROMPT_MIGRACAO_LOVABLE.md` e envie ao Lovable

---

**Você está pronto! Comece pelo documento 1 e siga em frente! 🎉**
