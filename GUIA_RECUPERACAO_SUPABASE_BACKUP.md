# Guia de Recuperação — Supabase + Backup SQL

**Status:** 🚨 RECUPERAÇÃO DE EMERGÊNCIA  
**Data:** 28 de Maio de 2026  
**Objetivo:** Restaurar FitJourney 2.0 com seu backup SQL

---

## 🚀 Passo 1: Criar Novo Supabase (5 minutos)

### 1.1 Acesse Supabase
```
https://supabase.com
```

### 1.2 Clique em "New Project"

### 1.3 Configure:
- **Organization:** Crie uma nova ou use existente
- **Project Name:** `nutrition-insights-fitjourney`
- **Database Password:** Crie uma senha forte (salve em local seguro!)
- **Region:** Escolha a mais próxima de você
- **Pricing Plan:** Free (grátis)

### 1.4 Aguarde criação
- Leva 2-3 minutos
- Você receberá um email de confirmação

---

## 🔄 Passo 2: Restaurar Seu Backup SQL (10 minutos)

### 2.1 Localize seu arquivo de backup

Procure por um arquivo SQL grande no seu computador:
- `backup.sql`
- `dump.sql`
- `export.sql`
- `nutrition-insights-backup.sql`
- Ou qualquer arquivo `.sql` com tamanho > 1MB

**Dica:** Procure em:
- Downloads
- Desktop
- Pasta do projeto
- Email (se foi enviado)

### 2.2 Abra o SQL Editor no Supabase

1. Vá para seu novo projeto
2. Clique em **SQL Editor** (lado esquerdo)
3. Clique em **New Query**

### 2.3 Cole o backup SQL

1. Abra seu arquivo de backup com um editor de texto
2. Copie TODO o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **Run**

### 2.4 Aguarde conclusão

- Pode levar alguns minutos
- Você verá mensagens de sucesso/erro
- Se houver erros, anote-os

---

## 🔑 Passo 3: Obter Credenciais (2 minutos)

### 3.1 Vá em Settings → API

1. No seu projeto Supabase
2. Clique em **Settings** (engrenagem)
3. Clique em **API**

### 3.2 Copie as credenciais

Você verá:
```
Project URL: https://seu-projeto.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Copie e salve em um arquivo seguro:**
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🚀 Passo 4: Deploy no Vercel (5 minutos)

### 4.1 Acesse Vercel

```
https://vercel.com/new
```

### 4.2 Conecte GitHub

1. Clique em **Continue with GitHub**
2. Autorize Vercel
3. Selecione o repositório `nutrition-insights`

### 4.3 Configure o Projeto

- **Project Name:** `nutrition-insights-fitjourney`
- **Framework:** Vite
- **Root Directory:** `./`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### 4.4 Adicione Variáveis de Ambiente

Clique em **Environment Variables** e adicione:

```
VITE_SUPABASE_URL = https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4.5 Deploy

Clique em **Deploy** e aguarde (2-3 minutos)

### 4.6 Resultado

Você receberá uma URL como:
```
https://nutrition-insights-fitjourney.vercel.app
```

---

## ✅ Checklist de Recuperação

- [ ] Novo Supabase criado
- [ ] Backup SQL restaurado
- [ ] Credenciais copiadas
- [ ] Vercel configurado
- [ ] Variáveis de ambiente adicionadas
- [ ] Deploy concluído
- [ ] App online e funcionando

---

## 🧪 Testar Após Deploy

1. Acesse sua URL do Vercel
2. Faça login
3. Verifique se seus dados estão lá
4. Teste criar um novo plano
5. Teste editar um plano

---

## 🚨 Troubleshooting

### Erro ao restaurar backup SQL

**Problema:** "Syntax error" ao colar o SQL

**Solução:**
1. Verifique se o arquivo está completo
2. Tente restaurar em partes (se muito grande)
3. Verifique se não há caracteres especiais

### Supabase não conecta

**Problema:** "Connection refused" ou "Invalid credentials"

**Solução:**
1. Verifique URL e Key (copie novamente)
2. Certifique-se que começam com `VITE_`
3. Redeploy no Vercel após adicionar variáveis

### Deploy falha

**Problema:** Build error no Vercel

**Solução:**
1. Verifique logs no Vercel
2. Certifique-se que `npm run build` funciona localmente
3. Verifique se todas as variáveis estão configuradas

---

## 📞 Suporte

Se tiver problemas:

1. **Supabase:** https://supabase.com/docs
2. **Vercel:** https://vercel.com/docs
3. **GitHub:** Verifique se o código está correto

---

## 🎯 Resultado Final

Após completar todos os passos:

✅ Seu app estará online  
✅ Seus dados restaurados  
✅ Pronto para usar  
✅ Sem dependência do Lovable  

**URL:** `https://nutrition-insights-fitjourney.vercel.app`

---

**Status:** 🟢 PRONTO PARA RECUPERAÇÃO  
**Tempo Total:** ~22 minutos  
**Custo:** Grátis (Supabase Free + Vercel Free)

