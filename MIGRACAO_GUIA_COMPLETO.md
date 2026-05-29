# Guia Completo — Migração de Pacientes para Novo Supabase

## 📋 Resumo Executivo

Você vai usar **Lovable com suas credenciais** para criar uma **Edge Function** que migra dados do Supabase antigo para o novo. Isso é **server-side, seguro e respeitando RLS**.

---

## 🔴 4 PERGUNTAS CRÍTICAS — RESPONDA ANTES DE ENVIAR PROMPT

### 1️⃣ **Você tem os service_role keys de ambos os projetos?**

**O que é:** Service_role key é uma chave de acesso total ao Supabase (sem respeitar RLS). Diferente da anon key que você vê no `.env`.

**Como obter:**
- Vá em **Supabase Dashboard → Settings → API**
- Copie a chave em **Service Role Key** (não Anon Key)
- Faça isso para AMBOS os projetos:
  - Supabase Antigo: `vkrcobprntictsxqmjjl`
  - Novo Supabase: `bhyyxrllhmisxyobbgfn`

**Responda:** Sim, tenho ambas as chaves? ✅ ou Não, preciso obter? ❌

---

### 2️⃣ **Qual é o escopo da migração?**

**Opção A — Minimalista (RECOMENDADO):**
- Migrar apenas: `patients`, `meal_plans`, `meal_plan_items`
- Não migrar: `auth.users`, tabelas antigas, dados clínicos complexos
- **Vantagem:** Rápido, seguro, sem conflitos de schema
- **Resultado:** Usuários fazem login normalmente no novo projeto

**Opção B — Completo:**
- Migrar TUDO do Supabase antigo
- Incluir: `anamnesis`, `clinical_assessments`, `dietary_restrictions`, etc.
- **Vantagem:** Nenhum dado fica para trás
- **Desvantagem:** Requer mapeamento de schema complexo, pode quebrar

**Responda:** Opção A (minimalista) ou Opção B (completo)?

---

### 3️⃣ **Como lidar com auth.users?**

**Opção A — Sem Migração de Usuários (RECOMENDADO):**
- Não migrar `auth.users` (impossível via SDK)
- Usuários fazem login normalmente no novo projeto
- Seus dados (`patients`, `meal_plans`) já estarão lá
- **Resultado:** Login funciona, dados aparecem

**Opção B — Migração Manual de Usuários:**
- Você cria manualmente os usuários no novo Supabase
- Ou usa Admin API do Supabase (mais complexo)
- **Resultado:** Usuários existentes conseguem fazer login com mesma senha

**Responda:** Opção A (sem migração) ou Opção B (migração manual)?

---

### 4️⃣ **Confirme os projetos:**

**Origem (Supabase Antigo):**
- Project ID: `vkrcobprntictsxqmjjl`
- URL: `https://vkrcobprntictsxqmjjl.supabase.co`
- Contém: Todos os pacientes, planos, dados históricos

**Destino (Novo Supabase):**
- Project ID: `bhyyxrllhmisxyobbgfn`
- URL: `https://bhyyxrllhmisxyobbgfn.supabase.co`
- Schema: Minimalista (6 tabelas)
- Contém: 84 alimentos, 1 template, 0 pacientes

**Responda:** Confirma que origem é `vkrcobprntictsxqmjjl` e destino é `bhyyxrllhmisxyobbgfn`? ✅

---

## 🚀 PASSO A PASSO — COMO ENVIAR PROMPT PARA LOVABLE

### Passo 1: Obtenha as Service Role Keys

1. Abra **Supabase Dashboard** → Projeto Antigo (`vkrcobprntictsxqmjjl`)
2. Vá em **Settings → API**
3. Copie a chave em **Service Role Key** (a longa, começa com `eyJ...`)
4. Salve em um lugar seguro (ex: arquivo temporário)
5. Repita para o novo projeto (`bhyyxrllhmisxyobbgfn`)

### Passo 2: Responda as 4 Perguntas

Antes de enviar o prompt, responda:
1. ✅ Tenho ambas as service_role keys?
2. ✅ Escopo: Opção A (minimalista) ou B (completo)?
3. ✅ Auth.users: Opção A (sem migração) ou B (manual)?
4. ✅ Confirma projetos: origem `vkrcobprntictsxqmjjl`, destino `bhyyxrllhmisxyobbgfn`?

### Passo 3: Abra Lovable com Suas Credenciais

1. Vá em **Lovable.dev**
2. Faça login com suas credenciais (não use Kiro)
3. Abra o projeto `nutrition-insights-fitjourney2.0`

### Passo 4: Copie e Cole o Prompt

1. Abra o arquivo: `PROMPT_MIGRACAO_LOVABLE.md`
2. Copie TODO o conteúdo (a partir de "## 📋 TAREFA")
3. Cole no chat do Lovable
4. **Antes de enviar**, substitua os placeholders:
   - `[VOCÊ FORNECERÁ — vá em Supabase → Settings → API → Service Role Key]`
   - Substitua pela service_role key do Supabase Antigo
   - Faça o mesmo para o novo Supabase

### Passo 5: Envie o Prompt

Clique em "Send" no Lovable. Lovable vai:
1. Criar a Edge Function `supabase/functions/migrate-patients/index.ts`
2. Implementar lógica de migração com service_role keys
3. Suportar `dryRun` mode (teste sem inserir)
4. Retornar relatório detalhado

### Passo 6: Teste com dryRun=true

Após Lovable criar a função:

```bash
# Teste local (sem inserir dados)
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

**Resultado esperado:**
```json
{
  "success": true,
  "summary": {
    "patients_migrated": 5,
    "meal_plans_migrated": 12,
    "meal_plan_items_migrated": 84,
    "errors": []
  }
}
```

### Passo 7: Execute Migração Real

Se `dryRun=true` funcionou, execute com `dryRun=false`:

```bash
curl -X POST http://localhost:54321/functions/v1/migrate-patients \
  -H "Content-Type: application/json" \
  -d '{
    "sourceServiceRoleKey": "eyJ...",
    "destServiceRoleKey": "eyJ...",
    "dryRun": false
  }'
```

### Passo 8: Valide no Novo Supabase

1. Abra **Supabase Dashboard** → Novo Projeto (`bhyyxrllhmisxyobbgfn`)
2. Vá em **SQL Editor**
3. Execute:
   ```sql
   SELECT COUNT(*) as total_patients FROM patients;
   SELECT COUNT(*) as total_meal_plans FROM meal_plans;
   SELECT COUNT(*) as total_items FROM meal_plan_items;
   ```
4. Confirme que os números batem com a migração

---

## ⚠️ IMPORTANTE — SEGURANÇA

- **Nunca compartilhe service_role keys** em público
- **Nunca coloque service_role keys no `.env` do frontend**
- **Service_role keys devem estar APENAS em Edge Functions** (server-side)
- **Após migração, delete as service_role keys** do seu histórico de chat

---

## 🎯 RESULTADO ESPERADO

Após completar todos os passos:

✅ Todos os pacientes aparecem no novo Supabase
✅ Todos os planos aparecem com dados corretos
✅ Integridade referencial mantida
✅ Usuários conseguem fazer login no novo projeto
✅ Nenhum dado foi perdido
✅ Vercel consegue fazer deploy com dados reais

---

## 📞 PRÓXIMOS PASSOS

1. **Responda as 4 perguntas críticas**
2. **Obtenha as service_role keys**
3. **Envie o prompt para Lovable**
4. **Teste com dryRun=true**
5. **Execute migração real com dryRun=false**
6. **Valide no novo Supabase**
7. **Faça deploy no Vercel**

---

**Pronto! Você está no caminho certo. Responda as 4 perguntas e vamos em frente!**
