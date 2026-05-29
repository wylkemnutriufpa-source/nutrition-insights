# Prompt para Lovable — Migração de Pacientes para Novo Supabase (CORRIGIDO)

**IMPORTANTE:** Este prompt foi corrigido para usar **server-side migration** com service_role keys, não frontend button.

Copie e cole este prompt no Lovable:

---

## 📋 TAREFA: Criar Edge Function para Migração de Pacientes

Preciso que você crie uma **Edge Function (server-side)** que migre dados do Supabase antigo para o novo, **respeitando RLS e usando service_role keys**.

### 🎯 Objetivo
Migrar pacientes, planos de refeição e itens do plano do **Supabase antigo** para o **novo Supabase**, preservando integridade referencial.

### ⚠️ CONTEXTO CRÍTICO

1. **RLS Respeita Anon Keys** — Anon keys só conseguem ler dados do usuário autenticado. Para migrar TODOS os pacientes, precisamos de **service_role keys** (server-side).

2. **Auth.users Não Pode Ser Migrado via SDK** — Os IDs de `auth.users` são gerenciados pelo Supabase. Não podemos copiar usuários entre projetos via SDK. **Solução:** Migrar apenas os dados de `patients`, `meal_plans`, `meal_plan_items`. Os usuários farão login normalmente no novo projeto.

3. **Frontend Button é Inseguro** — Nunca exponha service_role keys no frontend. A migração DEVE ser uma Edge Function (server-side).

4. **Schema Diferente** — Novo schema é minimalista (6 tabelas). Migrar apenas: `patients`, `meal_plans`, `meal_plan_items`.

### 📊 Dados a Migrar

**Origem (Supabase Antigo):**
- Tabela `patients` → Destino `patients`
- Tabela `meal_plans` → Destino `meal_plans`
- Tabela `meal_plan_items` → Destino `meal_plan_items`

**Destino (Novo Supabase):**
- Novo schema com 6 tabelas: `patients`, `foods`, `food_substitutions`, `v3_diet_templates`, `meal_plans`, `meal_plan_items`

### 🔑 Credenciais (VOCÊ FORNECERÁ)

**Supabase Antigo (Origem):**
```
URL: https://vkrcobprntictsxqmjjl.supabase.co
Service Role Key: [VOCÊ FORNECERÁ — vá em Supabase → Settings → API → Service Role Key]
```

**Novo Supabase (Destino):**
```
URL: https://bhyyxrllhmisxyobbgfn.supabase.co
Service Role Key: [VOCÊ FORNECERÁ — vá em Supabase → Settings → API → Service Role Key]
```

### 🛠️ Implementação

Crie uma **Edge Function** em:
```
supabase/functions/migrate-patients/index.ts
```

A função deve:

1. **Receber POST request** com:
   ```json
   {
     "sourceServiceRoleKey": "...",
     "destServiceRoleKey": "...",
     "dryRun": true  // true = apenas contar, false = executar migração
   }
   ```

2. **Conectar ao Supabase antigo** com service_role key
3. **Extrair dados** de `patients`, `meal_plans`, `meal_plan_items`
4. **Conectar ao novo Supabase** com service_role key
5. **Inserir dados** mantendo IDs originais (para integridade referencial)
6. **Validar integridade** — contar registros antes/depois
7. **Retornar relatório:**
   ```json
   {
     "success": true,
     "summary": {
       "patients_migrated": 5,
       "meal_plans_migrated": 12,
       "meal_plan_items_migrated": 84,
       "errors": []
     },
     "timestamp": "2026-05-29T..."
   }
   ```

### 📝 Requisitos Técnicos

- ✅ Usar `@supabase/supabase-js` com service_role keys
- ✅ Manter IDs originais (não gerar novos UUIDs)
- ✅ Respeitar integridade referencial (meal_plans.patient_id, meal_plan_items.meal_plan_id)
- ✅ Suportar `dryRun` mode (contar sem inserir)
- ✅ Tratar erros graciosamente (não parar na primeira falha)
- ✅ Adicionar logs detalhados
- ✅ Validar que dados foram inseridos corretamente

### 🚀 Onde Colocar

**Edge Function:**
```
supabase/functions/migrate-patients/index.ts
```

**Teste Local:**
```bash
supabase functions serve migrate-patients
curl -X POST http://localhost:54321/functions/v1/migrate-patients \
  -H "Content-Type: application/json" \
  -d '{
    "sourceServiceRoleKey": "...",
    "destServiceRoleKey": "...",
    "dryRun": true
  }'
```

### ⚠️ IMPORTANTE — ANTES DE EXECUTAR

1. **Obtenha service_role keys:**
   - Supabase Antigo: Settings → API → Service Role Key (copie)
   - Novo Supabase: Settings → API → Service Role Key (copie)

2. **Teste com dryRun=true primeiro:**
   ```json
   {
     "sourceServiceRoleKey": "...",
     "destServiceRoleKey": "...",
     "dryRun": true
   }
   ```
   Isso apenas conta registros, não insere nada.

3. **Depois execute com dryRun=false:**
   ```json
   {
     "sourceServiceRoleKey": "...",
     "destServiceRoleKey": "...",
     "dryRun": false
   }
   ```

4. **Valide os dados** no novo Supabase após migração

### 🎯 Resultado Esperado

Após executar a migração:
- ✅ Todos os pacientes aparecem no novo Supabase
- ✅ Todos os planos aparecem com dados corretos
- ✅ Integridade referencial mantida
- ✅ Usuários fazem login normalmente no novo projeto
- ✅ Nenhum dado foi perdido

---

## 📌 NOTAS TÉCNICAS

- **Não migre auth.users** — Usuários fazem login normalmente no novo projeto
- **Não migre tabelas antigas** — Novo schema é minimalista, apenas 6 tabelas
- **Service_role keys são sensíveis** — Use apenas em Edge Functions, nunca no frontend
- **Teste com dryRun=true** antes de executar migração real

---

**Pronto! Após executar, todos os pacientes estarão no novo Supabase e usuários conseguem fazer login!**

