# Opções de Deploy — Sem Lovable

**Status:** 📋 GUIA COMPLETO  
**Data:** 28 de Maio de 2026  
**Objetivo:** Deploy do FitJourney 2.0 sem depender do Lovable

---

## 🚀 Opções de Deploy (Ordenadas por Facilidade)

### 1. ✅ VERCEL (Recomendado — Mais Fácil)

**Vantagens:**
- Integração automática com GitHub
- Deploy em 1 clique
- Suporta Vite/React nativamente
- Variáveis de ambiente fáceis
- Preview automático de PRs
- Grátis para projetos pequenos

**Como fazer:**

```bash
# 1. Acesse https://vercel.com
# 2. Clique em "New Project"
# 3. Conecte seu GitHub
# 4. Selecione o repositório "nutrition-insights"
# 5. Configure as variáveis de ambiente:
#    - VITE_SUPABASE_URL
#    - VITE_SUPABASE_ANON_KEY
# 6. Clique em "Deploy"
```

**Tempo:** 5 minutos  
**Custo:** Grátis (até 100GB/mês)

---

### 2. ✅ NETLIFY (Alternativa Fácil)

**Vantagens:**
- Integração com GitHub
- Deploy automático
- Suporta Vite/React
- Variáveis de ambiente
- Grátis

**Como fazer:**

```bash
# 1. Acesse https://netlify.com
# 2. Clique em "Add new site"
# 3. Escolha "Import an existing project"
# 4. Conecte GitHub
# 5. Selecione o repositório
# 6. Configure:
#    - Build command: npm run build
#    - Publish directory: dist
# 7. Adicione variáveis de ambiente
# 8. Deploy automático
```

**Tempo:** 5 minutos  
**Custo:** Grátis

---

### 3. ✅ RAILWAY (Mais Controle)

**Vantagens:**
- Suporta Node.js, Postgres, etc
- Integração com GitHub
- Variáveis de ambiente
- Logs em tempo real
- Grátis (com créditos)

**Como fazer:**

```bash
# 1. Acesse https://railway.app
# 2. Clique em "New Project"
# 3. Escolha "Deploy from GitHub"
# 4. Conecte e selecione repositório
# 5. Configure:
#    - Build command: npm run build
#    - Start command: npm run preview
# 6. Adicione variáveis de ambiente
# 7. Deploy
```

**Tempo:** 10 minutos  
**Custo:** Grátis (com créditos mensais)

---

### 4. ✅ GITHUB PAGES (Mais Simples)

**Vantagens:**
- Totalmente grátis
- Hospedagem estática
- Integração nativa com GitHub
- Sem configuração de servidor

**Como fazer:**

```bash
# 1. Edite package.json:
"homepage": "https://seu-usuario.github.io/nutrition-insights"

# 2. Instale gh-pages:
npm install --save-dev gh-pages

# 3. Adicione scripts:
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"

# 4. Execute:
npm run deploy

# 5. Configure no GitHub:
# Settings → Pages → Source: gh-pages branch
```

**Tempo:** 10 minutos  
**Custo:** Grátis

---

### 5. ✅ AWS AMPLIFY (Mais Robusto)

**Vantagens:**
- Integração com AWS
- Suporta backend
- Escalável
- Variáveis de ambiente
- Grátis (até certos limites)

**Como fazer:**

```bash
# 1. Instale AWS CLI
# 2. Acesse AWS Amplify Console
# 3. Clique em "New app"
# 4. Conecte GitHub
# 5. Selecione repositório
# 6. Configure build settings
# 7. Deploy automático
```

**Tempo:** 15 minutos  
**Custo:** Grátis (até 15GB/mês)

---

### 6. ✅ DOCKER + HEROKU (Mais Controle)

**Vantagens:**
- Controle total
- Suporta qualquer tecnologia
- Escalável
- Logs detalhados

**Como fazer:**

```bash
# 1. Crie Dockerfile:
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]

# 2. Crie .dockerignore:
node_modules
npm-debug.log
dist
.git

# 3. Faça push para Heroku:
heroku login
heroku create seu-app-name
git push heroku main

# 4. Configure variáveis:
heroku config:set VITE_SUPABASE_URL=...
```

**Tempo:** 20 minutos  
**Custo:** Pago (Heroku descontinuou free tier)

---

## 📊 Comparação Rápida

| Opção | Facilidade | Custo | Tempo | Recomendação |
|-------|-----------|-------|-------|--------------|
| Vercel | ⭐⭐⭐⭐⭐ | Grátis | 5 min | 🥇 MELHOR |
| Netlify | ⭐⭐⭐⭐⭐ | Grátis | 5 min | 🥈 Alternativa |
| Railway | ⭐⭐⭐⭐ | Grátis | 10 min | 🥉 Bom |
| GitHub Pages | ⭐⭐⭐⭐ | Grátis | 10 min | Simples |
| AWS Amplify | ⭐⭐⭐ | Grátis | 15 min | Robusto |
| Docker+Heroku | ⭐⭐ | Pago | 20 min | Controle |

---

## 🔧 Configuração de Variáveis de Ambiente

Qualquer que seja a opção, você precisa configurar:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

**Onde encontrar:**
1. Acesse https://supabase.com
2. Selecione seu projeto
3. Vá em Settings → API
4. Copie URL e Anon Key

---

## ✅ Passo a Passo — VERCEL (Recomendado)

### 1. Prepare o Repositório

```bash
# Certifique-se que tudo está commitado
git status

# Se houver mudanças:
git add -A
git commit -m "Preparar para deploy"
git push origin fitjourney2.0
```

### 2. Acesse Vercel

```
https://vercel.com/new
```

### 3. Conecte GitHub

- Clique em "Continue with GitHub"
- Autorize Vercel
- Selecione o repositório "nutrition-insights"

### 4. Configure o Projeto

- **Project Name:** nutrition-insights-fitjourney
- **Framework:** Vite
- **Root Directory:** ./
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### 5. Adicione Variáveis de Ambiente

```
VITE_SUPABASE_URL = https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY = sua-chave-anonima
```

### 6. Deploy

Clique em "Deploy" e aguarde (2-3 minutos)

### 7. Resultado

Você receberá uma URL como:
```
https://nutrition-insights-fitjourney.vercel.app
```

---

## 🔄 Deploy Automático

Após configurar, qualquer push para `fitjourney2.0` fará deploy automático:

```bash
# Faça suas mudanças
git add -A
git commit -m "Nova feature"
git push origin fitjourney2.0

# Vercel detecta e faz deploy automaticamente
# Você recebe notificação quando estiver pronto
```

---

## 🧪 Testar Antes de Deploy

```bash
# Build local
npm run build

# Testar build
npm run preview

# Abra http://localhost:4173
```

---

## 📝 Checklist de Deploy

- [ ] Todas as mudanças commitadas
- [ ] Variáveis de ambiente configuradas
- [ ] Build passa sem erros (`npm run build`)
- [ ] Testes passam (`npm run test`)
- [ ] Lint passa (`npm run lint`)
- [ ] Supabase URL e Key corretos
- [ ] Domínio customizado (opcional)
- [ ] SSL/HTTPS ativado (automático)

---

## 🚨 Troubleshooting

### Build falha com erro de schema

```bash
npm run schema:update
npm run build
```

### Variáveis de ambiente não funcionam

- Certifique-se que começam com `VITE_`
- Redeploy após adicionar variáveis
- Verifique no console do navegador

### Supabase não conecta

- Verifique URL e Key
- Certifique-se que RLS está configurado
- Teste localmente com `npm run dev`

---

## 🎯 Recomendação Final

**Use VERCEL:**
- ✅ Mais fácil
- ✅ Mais rápido
- ✅ Melhor integração com GitHub
- ✅ Grátis
- ✅ Suporta Vite nativamente

**Tempo total:** 5 minutos  
**Custo:** Grátis

---

**Status:** 🟢 PRONTO PARA DEPLOY  
**Data:** 28 de Maio de 2026

