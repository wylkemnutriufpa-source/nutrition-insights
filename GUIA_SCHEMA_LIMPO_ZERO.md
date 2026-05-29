# Guia — Schema Limpo do Zero

**Status:** ✅ PRONTO PARA USAR  
**Data:** 29 de Maio de 2026  
**Objetivo:** Criar banco de dados limpo sem redundâncias

---

## 🎯 Por Que Criar do Zero?

### ✅ Vantagens
- **Limpo:** Apenas tabelas essenciais
- **Rápido:** Sem dados legados
- **Seguro:** RLS configurado desde o início
- **Moderno:** Estrutura alinhada com FitJourney 2.0
- **Fácil:** Sem conflitos ou redundâncias

### ❌ Problemas com Backup Gigante
- Tabelas antigas não usadas
- Dados de testes acumulados
- Possíveis conflitos de RLS
- Difícil de debugar

---

## 📋 O Que Este Schema Inclui

### Tabelas Essenciais
1. **patients** — Pacientes
2. **foods** — Alimentos (20 básicos inclusos)
3. **food_substitutions** — Substituições
4. **v3_diet_templates** — Templates de dieta
5. **meal_plans** — Planos de refeições
6. **meal_plan_items** — Itens do plano

### Segurança
- ✅ RLS (Row Level Security) configurado
- ✅ Políticas de acesso por usuário
- ✅ Dados isolados por paciente

### Dados Iniciais
- ✅ 20 alimentos básicos
- ✅ 1 template exemplo (Prático Café da Manhã)
- ✅ Imagens do Unsplash

---

## 🚀 Como Usar

### PASSO 1: Criar Novo Supabase

1. Acesse https://supabase.com
2. Clique em **"New Project"**
3. Configure:
   - **Project Name:** `nutrition-insights-fitjourney`
   - **Database Password:** Crie uma senha forte
   - **Region:** Escolha a mais próxima
   - **Pricing Plan:** Free
4. Aguarde 2-3 minutos

### PASSO 2: Executar o Schema

1. No novo Supabase, vá em **SQL Editor**
2. Clique em **New Query**
3. Copie TODO o conteúdo de `SCHEMA_LIMPO_ZERO.sql`
4. Cole no SQL Editor
5. Clique em **Run**

### PASSO 3: Verificar

Você verá uma mensagem como:
```
table_name          | row_count
--------------------|----------
patients            | 0
foods               | 20
v3_diet_templates   | 1
```

✅ **Pronto!** Seu banco está criado e limpo.

---

## 📊 Estrutura de Dados

### Tabela: patients
```sql
id (UUID)
user_id (UUID) — Referência ao usuário Supabase Auth
name (TEXT)
email (TEXT)
phone (TEXT)
date_of_birth (DATE)
gender (TEXT)
created_at, updated_at
```

### Tabela: foods
```sql
id (UUID)
name (TEXT) — Único
kcal_100g (NUMERIC)
protein_g, carbs_g, fat_g, fiber_g (NUMERIC)
unit (TEXT) — "g", "ml", "unidade", etc
portion_label (TEXT) — "1 ovo (50g)"
image_url (TEXT)
```

### Tabela: v3_diet_templates
```sql
id (UUID)
title (TEXT)
slug (TEXT) — Único, para URL
description (TEXT)
kcal_target (NUMERIC)
plan_snapshot (JSONB) — Estrutura completa do template
tags (JSONB) — Array de tags
active (BOOLEAN)
```

### Tabela: meal_plans
```sql
id (UUID)
patient_id (UUID) — Referência ao paciente
template_id (UUID) — Template usado (opcional)
title (TEXT)
kcal_target (NUMERIC)
status (TEXT) — "draft", "active", "completed"
plan_snapshot (JSONB) — Plano do paciente
```

### Tabela: meal_plan_items
```sql
id (UUID)
meal_plan_id (UUID) — Referência ao plano
food_id (UUID) — Referência ao alimento (opcional)
day_number (INTEGER)
meal_time (TEXT) — "08:00", "12:00", etc
quantity (NUMERIC)
display_quantity (NUMERIC) — Quantidade exibida
display_unit (TEXT) — Unidade exibida ("g", "unidade", etc)
description (TEXT)
kcal (NUMERIC)
```

---

## 🔐 RLS Policies

### Pacientes
- ✅ Usuário só vê seus próprios pacientes
- ✅ Usuário só pode inserir pacientes para si
- ✅ Usuário só pode atualizar seus pacientes

### Planos de Refeições
- ✅ Usuário só vê planos de seus pacientes
- ✅ Usuário só pode inserir planos para seus pacientes
- ✅ Usuário só pode atualizar seus planos

### Itens do Plano
- ✅ Usuário só vê itens de seus planos
- ✅ Usuário só pode inserir itens em seus planos
- ✅ Usuário só pode atualizar seus itens

### Alimentos e Templates
- ✅ Todos podem ler
- ✅ Apenas admin pode escrever (não implementado aqui)

---

## 📝 Próximos Passos

### 1. Criar Novo Supabase
```
https://supabase.com → New Project
```

### 2. Executar Schema
```
SQL Editor → New Query → Cole SCHEMA_LIMPO_ZERO.sql → Run
```

### 3. Obter Credenciais
```
Settings → API → Copie URL e Anon Key
```

### 4. Atualizar .env
```
VITE_SUPABASE_URL=https://seu-novo-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-nova-chave
```

### 5. Fazer Commit e Push
```
git add -A
git commit --no-verify -m "Update Supabase credentials for new project"
git push origin fitjourney2.0
```

### 6. Deploy no Vercel
```
Adicione as novas credenciais no Vercel
Clique em Deploy
```

---

## ✅ Checklist

- [ ] Novo Supabase criado
- [ ] Schema executado com sucesso
- [ ] Verificação mostra 20 foods e 1 template
- [ ] Credenciais copiadas
- [ ] .env atualizado
- [ ] Commit e push feitos
- [ ] Vercel configurado com novas credenciais
- [ ] Deploy concluído

---

## 🧪 Testar Após Deploy

1. Acesse seu app no Vercel
2. Faça login
3. Crie um novo paciente
4. Carregue o template "Prático Café da Manhã"
5. Verifique se os dados aparecem

---

## 📞 Troubleshooting

### Erro ao executar SQL
- Verifique se o Supabase está pronto (aguarde 2-3 min)
- Tente executar em partes (copie até a primeira tabela)

### Credenciais não funcionam
- Verifique se começam com `VITE_`
- Copie novamente do Supabase
- Redeploy no Vercel

### Dados não aparecem no app
- Verifique RLS policies
- Certifique-se que está logado
- Verifique console do navegador (F12)

---

**Status:** 🟢 PRONTO PARA USAR  
**Tempo Total:** ~20 minutos  
**Custo:** Grátis (Supabase Free + Vercel Free)

