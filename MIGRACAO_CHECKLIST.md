# ✅ Checklist — Migração de Pacientes

## 📋 ANTES DE ENVIAR PROMPT PARA LOVABLE

- [ ] **Pergunta 1:** Tenho ambas as service_role keys?
  - [ ] Service_role key do Supabase Antigo (`vkrcobprntictsxqmjjl`)
  - [ ] Service_role key do Novo Supabase (`bhyyxrllhmisxyobbgfn`)

- [ ] **Pergunta 2:** Escolhi o escopo?
  - [ ] Opção A: Minimalista (apenas `patients`, `meal_plans`, `meal_plan_items`)
  - [ ] Opção B: Completo (tudo do Supabase antigo)

- [ ] **Pergunta 3:** Escolhi estratégia de auth.users?
  - [ ] Opção A: Sem migração (usuários fazem login normalmente)
  - [ ] Opção B: Migração manual (criar usuários manualmente)

- [ ] **Pergunta 4:** Confirmei os projetos?
  - [ ] Origem: `vkrcobprntictsxqmjjl` ✅
  - [ ] Destino: `bhyyxrllhmisxyobbgfn` ✅

---

## 🚀 ENVIANDO PROMPT PARA LOVABLE

- [ ] Abri Lovable com minhas credenciais (não Kiro)
- [ ] Abri o projeto `nutrition-insights-fitjourney2.0`
- [ ] Copiei o arquivo `PROMPT_MIGRACAO_LOVABLE.md`
- [ ] Substituí os placeholders de service_role keys
- [ ] Enviei o prompt para Lovable
- [ ] Lovable criou a Edge Function `supabase/functions/migrate-patients/index.ts`

---

## 🧪 TESTANDO COM dryRun=true

- [ ] Executei `supabase functions serve migrate-patients`
- [ ] Testei com curl (dryRun=true)
- [ ] Recebi relatório com contagem de registros
- [ ] Nenhum dado foi inserido (apenas contagem)

**Resultado esperado:**
```json
{
  "success": true,
  "summary": {
    "patients_migrated": X,
    "meal_plans_migrated": Y,
    "meal_plan_items_migrated": Z,
    "errors": []
  }
}
```

---

## 🔄 EXECUTANDO MIGRAÇÃO REAL (dryRun=false)

- [ ] Confirmei que dryRun=true funcionou
- [ ] Executei com dryRun=false
- [ ] Recebi confirmação de sucesso
- [ ] Nenhum erro foi retornado

---

## ✔️ VALIDANDO NO NOVO SUPABASE

- [ ] Abri Supabase Dashboard → Novo Projeto (`bhyyxrllhmisxyobbgfn`)
- [ ] Executei query para contar `patients`
- [ ] Executei query para contar `meal_plans`
- [ ] Executei query para contar `meal_plan_items`
- [ ] Números batem com a migração

**Queries para validar:**
```sql
SELECT COUNT(*) as total_patients FROM patients;
SELECT COUNT(*) as total_meal_plans FROM meal_plans;
SELECT COUNT(*) as total_items FROM meal_plan_items;
```

---

## 🔐 SEGURANÇA PÓS-MIGRAÇÃO

- [ ] Deletei as service_role keys do meu histórico de chat
- [ ] Não compartilhei service_role keys em público
- [ ] Confirmei que service_role keys estão APENAS na Edge Function
- [ ] Não coloquei service_role keys no `.env` do frontend

---

## 🚀 PRÓXIMOS PASSOS

- [ ] Migração concluída com sucesso
- [ ] Dados validados no novo Supabase
- [ ] Pronto para fazer deploy no Vercel
- [ ] Usuários conseguem fazer login e ver seus dados

---

## 📞 TROUBLESHOOTING

### ❌ Erro: "Service role key inválida"
- [ ] Verifiquei que copiei a chave correta (não anon key)
- [ ] Verifiquei que não há espaços extras na chave
- [ ] Verifiquei que a chave começa com `eyJ...`

### ❌ Erro: "Integridade referencial quebrada"
- [ ] Verifiquei que IDs foram mantidos (não gerados novos)
- [ ] Verifiquei que `meal_plans.patient_id` aponta para pacientes existentes
- [ ] Verifiquei que `meal_plan_items.meal_plan_id` aponta para planos existentes

### ❌ Erro: "Nenhum dado foi migrado"
- [ ] Verifiquei que o Supabase antigo tem dados
- [ ] Verifiquei que a service_role key tem permissão de leitura
- [ ] Verifiquei que as tabelas existem no Supabase antigo

### ❌ Erro: "Dados duplicados"
- [ ] Verifiquei que executei apenas uma vez (não duas)
- [ ] Verifiquei que dryRun=true foi usado para teste

---

**Pronto! Siga este checklist e a migração será um sucesso! 🎉**
